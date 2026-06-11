"""사업계획서 → HWPX 문서 (인쇄 영역 템플릿만)."""

from __future__ import annotations

from typing import Any

from app.common.hwpx.models import HwpxDocument


def build_business_plan_hwpx(
    form_data: dict[str, Any],
    sections: list[dict[str, Any]] | None = None,
) -> HwpxDocument:
    """HWPX 다운로드 — 템플릿 인쇄 영역(표) + sections(대목차·본문)."""
    return HwpxDocument(
        title=str(form_data.get("projectName") or "사업계획서"),
        sections=[],
        template_kind="plan",
        template_fill={"form_data": form_data, "sections": sections or []},
    )
