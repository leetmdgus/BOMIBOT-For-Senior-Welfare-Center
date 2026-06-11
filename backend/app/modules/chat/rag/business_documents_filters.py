"""사업문서 검색 — 연도·카테고리·확장자 필터."""

from __future__ import annotations

from typing import Any


def file_extension(name: str) -> str:
    raw = str(name or "").strip().lower()
    if not raw or "." not in raw:
        return ""
    return raw.rsplit(".", 1)[-1]


def collect_document_facets(corpus: list[dict[str, Any]]) -> dict[str, list[str]]:
    years: set[str] = set()
    categories: set[str] = set()
    extensions: set[str] = set()
    for chunk in corpus:
        meta = chunk.get("meta") if isinstance(chunk.get("meta"), dict) else {}
        year = str(meta.get("year") or "").strip()
        if year:
            years.add(year)
        major = str(meta.get("majorCategory") or "").strip()
        if major:
            categories.add(major)
        ext = str(meta.get("extension") or "").strip().lower()
        if ext:
            extensions.add(ext)
    return {
        "years": sorted(years, reverse=True),
        "categories": sorted(categories),
        "extensions": sorted(extensions),
    }


def filter_business_documents_corpus(
    corpus: list[dict[str, Any]],
    *,
    year: str | None = None,
    category: str | None = None,
    extension: str | None = None,
) -> list[dict[str, Any]]:
    year_filter = str(year or "").strip()
    category_filter = str(category or "").strip().lower()
    extension_filter = str(extension or "").strip().lstrip(".").lower()

    if not year_filter and not category_filter and not extension_filter:
        return corpus

    filtered: list[dict[str, Any]] = []
    for chunk in corpus:
        meta = chunk.get("meta") if isinstance(chunk.get("meta"), dict) else {}
        if year_filter and str(meta.get("year") or "").strip() != year_filter:
            continue
        if category_filter:
            haystack = " ".join(
                str(meta.get(key) or "")
                for key in ("majorCategory", "categoryTitle", "taskTitle")
            ).lower()
            if category_filter not in haystack:
                continue
        if extension_filter:
            doc_kind = str(meta.get("docKind") or "")
            if doc_kind in ("plan", "evaluation"):
                continue
            if str(meta.get("extension") or "").lower() != extension_filter:
                continue
        filtered.append(chunk)
    return filtered
