"""HWPX render_json 생성·적용·다운로드 (step2 치환 + step3 렌더링)."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from app.application.hwpx.filename import build_hwpx_download_filename
from app.application.hwpx.render.apply_form import apply_evaluation_form, apply_plan_form
from app.application.hwpx.render.byte_pack import pack_render_hwpx_bytes
from app.application.hwpx.render.file_json_render import preview_from_file_json
from app.application.hwpx.render.html_preview import (
    render_json_to_body_fragment,
    render_json_to_html,
)
from app.application.hwpx.render.page_canvas import wrap_page_canvas_html
from app.application.hwpx.render.pipeline import build_file_json_from_template
from app.application.hwpx.render.template_registry import (
    HwpxRenderTemplateKind,
    PLAN_TEMPLATE_TITLE,
    has_render_template,
)


@lru_cache(maxsize=8)
def _base_file_json_cached(kind: HwpxRenderTemplateKind, mtime_ns: int) -> str:
    import json

    del mtime_ns
    return json.dumps(build_file_json_from_template(kind), ensure_ascii=False)


class HwpxRenderService:
    def has_template(self, kind: HwpxRenderTemplateKind) -> bool:
        return has_render_template(kind)

    def get_base_file_json(self, kind: HwpxRenderTemplateKind) -> dict[str, Any]:
        import json
        from app.application.hwpx.render.template_registry import render_template_hwpx_path

        path = render_template_hwpx_path(kind)
        mtime_ns = path.stat().st_mtime_ns if path.is_file() else 0
        return json.loads(_base_file_json_cached(kind, mtime_ns))

    def get_base_render_json(self, kind: HwpxRenderTemplateKind) -> dict[str, Any]:
        return preview_from_file_json(self.get_base_file_json(kind))

    def build_plan_file_json(
        self,
        form: dict[str, Any],
        *,
        sections: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return apply_plan_form(
            self.get_base_file_json("plan"),
            form,
            sections=sections,
            template_kind="plan",
        )

    def build_plan_render_json(
        self,
        form: dict[str, Any],
        *,
        sections: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return preview_from_file_json(self.build_plan_file_json(form, sections=sections))

    def build_evaluation_file_json(self, evaluation: dict[str, Any]) -> dict[str, Any]:
        return apply_evaluation_form(
            self.get_base_file_json("evaluation"), evaluation, template_kind="evaluation"
        )

    def build_evaluation_render_json(self, evaluation: dict[str, Any]) -> dict[str, Any]:
        return preview_from_file_json(self.build_evaluation_file_json(evaluation))

    def build_plan_hwpx(
        self,
        *,
        form_data: dict[str, Any],
        sections: list[dict[str, Any]] | None = None,
    ) -> tuple[bytes, str]:
        payload = pack_render_hwpx_bytes(
            "plan",
            form_data=form_data,
            sections=sections or [],
        )
        filename = build_hwpx_download_filename(
            str(form_data.get("projectName") or ""),
            doc_kind="plan",
            period=str(form_data.get("period") or ""),
        )
        return payload, filename

    def build_evaluation_hwpx(
        self,
        *,
        evaluation: dict[str, Any],
        plan_form: dict[str, Any] | None = None,
    ) -> tuple[bytes, str]:
        del plan_form
        payload = pack_render_hwpx_bytes("evaluation", evaluation=evaluation)
        filename = build_hwpx_download_filename(
            str(evaluation.get("programName") or ""),
            doc_kind="evaluation",
            period=str(evaluation.get("period") or ""),
        )
        return payload, filename

    def build_plan_preview_html(
        self,
        form: dict[str, Any],
        *,
        sections: list[dict[str, Any]] | None = None,
        page_canvas: bool = True,
    ) -> str:
        render_json = self.build_plan_render_json(form, sections=sections)
        body = render_json_to_body_fragment(render_json)
        if not page_canvas:
            return render_json_to_html(render_json)
        return wrap_page_canvas_html(
            body,
            title=PLAN_TEMPLATE_TITLE,
            document_title=None,
            header_label="사회복지사업 단위사업계획서 · HWPX 미리보기",
        )

    def build_evaluation_preview_html(
        self,
        evaluation: dict[str, Any],
        *,
        page_canvas: bool = True,
    ) -> str:
        render_json = self.build_evaluation_render_json(evaluation)
        body = render_json_to_body_fragment(render_json)
        title = str(evaluation.get("programName") or "사업평가서")
        doc_title = f"{title} 최종사업평가서"
        if not page_canvas:
            return render_json_to_html(render_json)
        return wrap_page_canvas_html(
            body,
            title=doc_title,
            document_title=None,
            header_label="최종사업평가서 · HWPX 미리보기",
        )
