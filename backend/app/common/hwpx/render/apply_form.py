"""step2 — file_json.section.data 트리에 formData 치환."""

from __future__ import annotations

import copy
from typing import Any

from app.common.hwpx.render.evaluation_table_ops import fill_all_evaluation_tables_json
from app.common.hwpx.render.plan_table_ops import fill_all_plan_tables_json


def apply_plan_form(
    file_json: dict[str, Any],
    form: dict[str, Any],
    *,
    sections: list[dict[str, Any]] | None = None,
    template_kind: str = "plan",
) -> dict[str, Any]:
    """step2 — section.data 표 셀 치환(요약·참고 표·세부사업 행 확장) 후 render 갱신."""
    from app.common.hwpx.render.file_json_render import attach_render_field

    doc = copy.deepcopy(file_json)
    section = doc["section"]["data"]
    fill_all_plan_tables_json(section, form, sections=sections)
    attach_render_field(doc, template_kind=template_kind)
    return doc


def apply_evaluation_form(
    file_json: dict[str, Any],
    evaluation: dict[str, Any],
    *,
    template_kind: str = "evaluation",
) -> dict[str, Any]:
    from app.common.hwpx.render.file_json_render import attach_render_field

    doc = copy.deepcopy(file_json)
    section = doc["section"]["data"]
    fill_all_evaluation_tables_json(section, evaluation)
    attach_render_field(doc, template_kind=template_kind)
    return doc
