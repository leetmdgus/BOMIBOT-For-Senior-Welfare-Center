"""HWPX render 템플릿 — Docker/배포용 번들 + 로컬 HWPX_TEMPLATES 폴백."""

from __future__ import annotations

import os
import zipfile
from functools import lru_cache
from pathlib import Path
from typing import Literal

HwpxRenderTemplateKind = Literal["plan", "evaluation"]

# 기본 양식 (HWPX_TEMPLATES/)
DEFAULT_PLAN_TEMPLATE_FILENAME = "ex_사업계획서(2).hwpx"
DEFAULT_EVALUATION_TEMPLATE_FILENAME = "ex_사업평가 2.hwpx"

PLAN_TEMPLATE_TITLE = "사회복지사업 단위사업계획서"
# @deprecated — 구 스크립트·문서 호환
PLAN_TEMPLATE_LEGACY_FILENAME = "ex_사업계획.hwpx"

_BACKEND_ROOT = Path(__file__).resolve().parents[4]
_BUNDLED_RENDER_DIR = Path(__file__).resolve().parent.parent / "templates" / "render"
_HWPX_TEMPLATES_DIR = Path(
    os.environ.get("HWPX_TEMPLATES_DIR", str(_BACKEND_ROOT / "HWPX_TEMPLATES"))
)

_BUNDLED_HWPX: dict[HwpxRenderTemplateKind, str] = {
    "plan": "plan.hwpx",
    "evaluation": "evaluation.hwpx",
}

_DEFAULT_HWPX: dict[HwpxRenderTemplateKind, str] = {
    "plan": DEFAULT_PLAN_TEMPLATE_FILENAME,
    "evaluation": DEFAULT_EVALUATION_TEMPLATE_FILENAME,
}

# 이전 기본값 (폴백)
_LEGACY_HWPX: dict[HwpxRenderTemplateKind, str] = {
    "plan": "ex_사업계획.hwpx",
    "evaluation": "ex_사업평가.hwpx",
}


def hwpx_templates_dir() -> Path:
    return _HWPX_TEMPLATES_DIR


def default_template_filename(kind: HwpxRenderTemplateKind) -> str:
    return _DEFAULT_HWPX[kind]


def _candidate_paths(kind: HwpxRenderTemplateKind) -> list[Path]:
    """ex_사업계획서(2).hwpx / ex_사업평가 2.hwpx (HWPX_TEMPLATES) 우선 → Docker 번들 폴백."""
    return [
        _HWPX_TEMPLATES_DIR / _DEFAULT_HWPX[kind],
        _BUNDLED_RENDER_DIR / _BUNDLED_HWPX[kind],
        _HWPX_TEMPLATES_DIR / _BUNDLED_HWPX[kind],
        _HWPX_TEMPLATES_DIR / _LEGACY_HWPX[kind],
    ]


def render_template_hwpx_path(kind: HwpxRenderTemplateKind) -> Path:
    for path in _candidate_paths(kind):
        if path.is_file():
            return path
    return _candidate_paths(kind)[0]


def has_render_template(kind: HwpxRenderTemplateKind) -> bool:
    return render_template_hwpx_path(kind).is_file()


@lru_cache(maxsize=8)
def _load_render_template_bytes_cached(
    kind: HwpxRenderTemplateKind, mtime_ns: int
) -> bytes:
    del mtime_ns  # cache key — 템플릿 파일 수정 시 자동 무효화
    path = render_template_hwpx_path(kind)
    return path.read_bytes()


def load_render_template_bytes(kind: HwpxRenderTemplateKind) -> bytes:
    path = render_template_hwpx_path(kind)
    if not path.is_file():
        tried = ", ".join(str(p) for p in _candidate_paths(kind))
        raise FileNotFoundError(
            f"HWPX render template not found for {kind!r}. Tried: {tried}"
        )
    return _load_render_template_bytes_cached(kind, path.stat().st_mtime_ns)


@lru_cache(maxsize=8)
def _load_render_section0_cached(kind: HwpxRenderTemplateKind, mtime_ns: int) -> bytes:
    del mtime_ns
    with zipfile.ZipFile(render_template_hwpx_path(kind)) as zf:
        return zf.read("Contents/section0.xml")


def load_render_section0_bytes(kind: HwpxRenderTemplateKind) -> bytes:
    path = render_template_hwpx_path(kind)
    if not path.is_file():
        raise FileNotFoundError(f"HWPX render template not found for {kind!r}")
    return _load_render_section0_cached(kind, path.stat().st_mtime_ns)


@lru_cache(maxsize=8)
def _load_render_prv_text_cached(kind: HwpxRenderTemplateKind, mtime_ns: int) -> bytes:
    del mtime_ns
    with zipfile.ZipFile(render_template_hwpx_path(kind)) as zf:
        return zf.read("Preview/PrvText.txt")


def load_render_prv_text_bytes(kind: HwpxRenderTemplateKind) -> bytes:
    path = render_template_hwpx_path(kind)
    if not path.is_file():
        raise FileNotFoundError(f"HWPX render template not found for {kind!r}")
    return _load_render_prv_text_cached(kind, path.stat().st_mtime_ns)
