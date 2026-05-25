"""CORS — 로컬 Next.js + Vercel(프로덕션/Preview) Origin 허용."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.config import Settings

# 브라우저 Origin (프론트). API 호스트(api-workspace.bomi.ai.kr)는 넣지 않음.
DEV_DEFAULT_ORIGINS: tuple[str, ...] = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
)

# 배포 시 env 미설정이어도 동작하도록 기본 허용(프론트 커스텀 도메인은 CORS_ORIGINS에 추가)
PRODUCTION_DEFAULT_ORIGINS: tuple[str, ...] = ()

# Vercel Preview / Production (*.vercel.app)
DEFAULT_VERCEL_ORIGIN_REGEX = r"https://.*\.vercel\.app"

# 프론트 커스텀 도메인 (*.bomi.ai.kr, API 호스트 제외는 CORS_ORIGINS로 보완)
DEFAULT_BOMI_FRONTEND_REGEX = r"https://.*\.bomi\.ai\.kr"

# 로컬 Next.js — 포트 가변 (3000, 3001 등)
DEFAULT_LOCAL_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1)(:\d+)?"


def _merge_unique(*groups: list[str]) -> list[str]:
    seen: set[str] = set()
    merged: list[str] = []
    for group in groups:
        for origin in group:
            origin = origin.strip()
            if not origin or origin in seen:
                continue
            seen.add(origin)
            merged.append(origin)
    return merged


def resolve_cors_origins(settings: Settings) -> list[str]:
    from_env = settings.cors_origin_list
    if settings.is_development:
        return _merge_unique(list(DEV_DEFAULT_ORIGINS), from_env)
    return _merge_unique(list(PRODUCTION_DEFAULT_ORIGINS), from_env)


def resolve_cors_origin_regex(settings: Settings) -> str | None:
    raw = (settings.cors_origin_regex or "").strip()
    if raw:
        return raw
    patterns: list[str] = []
    if settings.is_development:
        patterns.append(DEFAULT_LOCAL_ORIGIN_REGEX)
    if settings.cors_allow_vercel_regex:
        patterns.append(DEFAULT_VERCEL_ORIGIN_REGEX)
    if settings.cors_allow_bomi_regex:
        patterns.append(DEFAULT_BOMI_FRONTEND_REGEX)
    if not patterns:
        return None
    return "|".join(f"({p})" for p in patterns)


def validate_cors_origin_regex(pattern: str | None) -> None:
    if not pattern:
        return
    try:
        re.compile(pattern)
    except re.error as exc:
        raise ValueError(f"Invalid CORS_ORIGIN_REGEX: {exc}") from exc


def cors_middleware_kwargs(settings: Settings) -> dict:
    origins = resolve_cors_origins(settings)
    origin_regex = resolve_cors_origin_regex(settings)
    validate_cors_origin_regex(origin_regex)

    # development: 브라우저 preflight가 요청하는 모든 헤더 허용 (한글 이름 B64 등)
    allow_headers: list[str] | str = (
        ["*"]
        if settings.is_development
        else [
            "Authorization",
            "Content-Type",
            "X-Region-Id",
            "X-User-Name",
            "X-User-Name-B64",
            "Accept",
            "Origin",
        ]
    )

    kwargs: dict = {
        "allow_origins": origins,
        "allow_credentials": True,
        "allow_methods": ["*"] if settings.is_development else ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": allow_headers,
        "expose_headers": ["Content-Type"],
        "max_age": 600,
    }
    if origin_regex:
        kwargs["allow_origin_regex"] = origin_regex
    return kwargs
