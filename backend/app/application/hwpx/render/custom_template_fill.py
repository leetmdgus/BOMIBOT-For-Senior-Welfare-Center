"""임의 업로드 양식(.hwpx)에 계획/평가 값을 라벨 매칭으로 채워 원본 보존 내보내기.

기본 양식(template_registry)은 셀 좌표 고정 cell-map 으로 정확히 채우지만, 사용자가
업로드한 임의 양식은 표 구조를 알 수 없다. 여기서는 표의 '라벨 칸' 텍스트를 알려진
필드 라벨과 매칭해, 같은 행 오른쪽(또는 아래) 값 칸에 값을 주입하는 best-effort 방식.

    파싱(frontendJson) → 라벨 매칭으로 값 칸 채움 → export_hwpx_preserving(원본 절대 보존)

매칭 실패한 칸은 건드리지 않으므로 원본이 그대로 유지된다. 슬롯 자동탐지/AI 매핑은 추후 과제.
"""

from __future__ import annotations

import re
from typing import Any, Callable

from app.application.hwpx.automation.section0_writeback import export_hwpx_preserving
from app.application.hwpx.automation.service import HwpxAutomationService
from app.application.hwpx.render.evaluation_table_ops import resolve_evaluation_field
from app.application.hwpx.render.plan_table_ops import resolve_plan_field

_hwpx = HwpxAutomationService()


def _norm(text: Any) -> str:
    """라벨 비교용 정규화 — 모든 공백 제거."""
    return re.sub(r"\s+", "", str(text or ""))


# 정규화된 라벨 → 필드 키 (정확 일치). 별칭 포함, '예산과목'/'소요예산' 충돌은 정확 일치로 회피.
PLAN_LABEL_FIELDS: dict[str, str] = {
    "사업명": "projectName",
    "목적": "purpose",
    "목표": "goals",
    "사업기간": "period",
    "기간": "period",
    "사업대상": "target",
    "대상": "target",
    "연인원수/횟수": "totalCount",
    "연인원수": "totalCount",
    "소요예산(원)": "budget",
    "소요예산": "budget",
    "예산과목": "budgetCategory",
    "담당": "manager",
    "담당자": "manager",
}

EVALUATION_LABEL_FIELDS: dict[str, str] = {
    "사업팀": "team",
    "담당자": "manager",
    "담당": "manager",
    "사업기간": "period",
    "평가일": "evaluationDate",
    "프로그램명": "programName",
    "사업명": "programName",
    "대상": "target",
    "사업대상": "target",
    "목적": "purpose",
    "목표": "goals",
    "성과지표": "performanceIndicator",
    "평가도구": "evaluationTool",
    "성과주요요인분석": "keyFactorAnalysis",
    "주요요인분석": "keyFactorAnalysis",
    "목표적절성": "goalAppropriacy",
    "목표적합성": "goalAppropriacy",
    "제언및향후계획": "suggestion",
    "제언": "suggestion",
    "슈퍼비전": "supervision",
    "예산(원)": "planBudget",
    "지출(원)": "actualExpense",
    "계획인원(명/회)": "planCount",
    "실행인원(명/회)": "actualCount",
}


def _set_cell_text(cell: dict[str, Any], text: str) -> None:
    """frontendJson 셀에 값 주입 — cell.text + 첫 text_run(run_index=0).

    template-frontend-json.ts setFirstTextRun 과 동일 규칙: 빈 칸은 파서가 빈 run 을
    버려 text_run 이 없으므로 run_index=0 으로 주입한다(writeback 이 0번 <run> 을 찾음).
    """
    cell["text"] = text
    paragraphs = cell.setdefault("paragraphs", [])
    for para in paragraphs:
        for run in para.get("runs") or []:
            if run.get("type") == "text_run":
                run["text"] = text
                return
    if not paragraphs:
        paragraphs.append({"type": "paragraph", "runs": [], "text": text})
    paragraphs[0].setdefault("runs", []).append(
        {"type": "text_run", "run_index": 0, "text": text}
    )


def _iter_table_runs(frontend_json: dict[str, Any]):
    for para in (frontend_json.get("document") or {}).get("paragraphs") or []:
        for run in para.get("runs") or []:
            if run.get("type") == "table":
                yield run


def _fill_tables(
    frontend_json: dict[str, Any],
    label_fields: dict[str, str],
    resolve: Callable[[str], str],
) -> int:
    """표마다 라벨 칸을 찾아 인접 값 칸에 값을 채운다. 채운 칸 수 반환."""
    filled = 0
    for tbl in _iter_table_runs(frontend_json):
        cells_by_addr: dict[tuple[int, int], dict[str, Any]] = {}
        all_cells: list[dict[str, Any]] = []
        for row in tbl.get("rows") or []:
            for cell in row.get("cells") or []:
                r, c = cell.get("row"), cell.get("col")
                if isinstance(r, int) and isinstance(c, int):
                    cells_by_addr[(r, c)] = cell
                all_cells.append(cell)

        for cell in all_cells:
            field = label_fields.get(_norm(cell.get("text")))
            if not field:
                continue
            r, c = cell.get("row"), cell.get("col")
            if not isinstance(r, int) or not isinstance(c, int):
                continue
            cspan = cell.get("col_span") or 1
            rspan = cell.get("row_span") or 1

            # 같은 행 오른쪽 값 칸 우선 → 없거나 또 다른 라벨이면 아래 칸
            target = cells_by_addr.get((r, c + cspan))
            if target is None or _norm(target.get("text")) in label_fields:
                below = cells_by_addr.get((r + rspan, c))
                if below is not None and _norm(below.get("text")) not in label_fields:
                    target = below
            if target is None or _norm(target.get("text")) in label_fields:
                continue

            _set_cell_text(target, resolve(field))
            filled += 1
    return filled


def fill_custom_plan_hwpx(
    template_bytes: bytes,
    form_data: dict[str, Any],
    *,
    sections: list[dict[str, Any]] | None = None,
    source_filename: str = "template.hwpx",
) -> bytes:
    """업로드 양식에 사업계획 요약 값을 라벨 매칭으로 채워 HWPX bytes 반환."""
    del sections  # 임의 양식엔 대목차·본문 참고 표 구조가 없으므로 요약 값만 채움
    parsed = _hwpx.parse_hwpx_bytes(template_bytes, source_filename=source_filename)
    frontend_json = parsed["frontendJson"]
    _fill_tables(
        frontend_json,
        PLAN_LABEL_FIELDS,
        lambda key: resolve_plan_field(form_data, key),
    )
    return export_hwpx_preserving(template_bytes, frontend_json)


def fill_custom_evaluation_hwpx(
    template_bytes: bytes,
    evaluation: dict[str, Any],
    *,
    source_filename: str = "template.hwpx",
) -> bytes:
    """업로드 양식에 사업평가 값을 라벨 매칭으로 채워 HWPX bytes 반환."""
    parsed = _hwpx.parse_hwpx_bytes(template_bytes, source_filename=source_filename)
    frontend_json = parsed["frontendJson"]
    _fill_tables(
        frontend_json,
        EVALUATION_LABEL_FIELDS,
        lambda key: resolve_evaluation_field(evaluation, key),
    )
    return export_hwpx_preserving(template_bytes, frontend_json)
