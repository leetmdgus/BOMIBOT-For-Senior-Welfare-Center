"""최종사업평가서 → HWPX 문서 (인쇄 영역 템플릿만)."""

from __future__ import annotations

from typing import Any

from app.common.hwpx.models import HwpxDocument


def build_business_evaluation_hwpx(
    evaluation: dict[str, Any],
    plan_form: dict[str, Any] | None = None,
) -> HwpxDocument:
    """HWPX 다운로드 — ex_사업평가 2.hwpx 템플릿 표·PrvText 치환 + sections(대목차·본문)."""
    program_name = str(evaluation.get("programName") or "")
    title = f"{program_name} 최종사업평가서" if program_name else "최종사업평가서"

    return HwpxDocument(
        title=title,
        sections=[],
        template_kind="evaluation",
        template_fill={
            "evaluation": evaluation,
            "plan_form": plan_form or {},
        },
    )
