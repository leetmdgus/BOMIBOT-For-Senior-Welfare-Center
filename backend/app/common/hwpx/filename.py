"""HWPX 다운로드 파일명 — 사업명_사업계획|사업평가_연도.hwpx"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from app.common.hwpx.encoding import sanitize_hwpx_text

_DOC_LABEL = {
    "plan": "단위사업계획서",
    "evaluation": "사업평가",
}


def extract_year_from_period(period: str | None) -> str:
    text = str(period or "")
    match = re.search(r"(20\d{2})", text)
    if match:
        return match.group(1)
    return str(datetime.now().year)


def build_hwpx_download_filename(
    business_name: str | None,
    *,
    doc_kind: Literal["plan", "evaluation"],
    period: str | None = None,
) -> str:
    fallback = (
        "사회복지사업 단위사업계획서"
        if doc_kind == "plan"
        else "사업평가서"
    )
    raw = sanitize_hwpx_text((business_name or "").strip() or fallback)
    for char in '\\/:*?"<>|':
        raw = raw.replace(char, "_")
    safe_name = re.sub(r"\s+", "_", raw).strip("._") or "사업"
    year = extract_year_from_period(period)
    label = _DOC_LABEL[doc_kind]
    return f"{safe_name}_{label}_{year}.hwpx"
