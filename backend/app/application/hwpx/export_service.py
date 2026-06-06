"""HWPX export — HWPX_TEMPLATES render_json 파이프라인."""

from __future__ import annotations

from typing import Any

from app.application.hwpx.render.service import HwpxRenderService


class HwpxExportService:
    def __init__(self) -> None:
        self._render = HwpxRenderService()

    def build_business_plan_hwpx(
        self,
        *,
        form_data: dict[str, Any],
        sections: list[dict[str, Any]],
        template_bytes: bytes | None = None,
    ) -> tuple[bytes, str]:
        return self._render.build_plan_hwpx(
            form_data=form_data,
            sections=sections,
            template_bytes=template_bytes,
        )

    def build_business_evaluation_hwpx(
        self,
        *,
        evaluation: dict[str, Any],
        plan_form: dict[str, Any] | None = None,
        template_bytes: bytes | None = None,
    ) -> tuple[bytes, str]:
        return self._render.build_evaluation_hwpx(
            evaluation=evaluation,
            plan_form=plan_form,
            template_bytes=template_bytes,
        )

    def build_business_plan_preview_html(
        self,
        *,
        form_data: dict[str, Any],
        sections: list[dict[str, Any]] | None = None,
        template_bytes: bytes | None = None,
    ) -> str:
        return self._render.build_plan_preview_html(
            form_data,
            sections=sections,
            template_bytes=template_bytes,
        )

    def build_business_evaluation_preview_html(
        self,
        *,
        evaluation: dict[str, Any],
        template_bytes: bytes | None = None,
    ) -> str:
        return self._render.build_evaluation_preview_html(
            evaluation, template_bytes=template_bytes
        )