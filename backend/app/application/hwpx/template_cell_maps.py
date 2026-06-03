"""HWPX 템플릿 표 셀 ↔ 앱 필드 1:1 매핑 (인쇄 영역).

좌표는 `cellAddr` (rowAddr, colAddr) 기준. 값 칸만 채우고 라벨 칸은 템플릿 유지.
"""

from __future__ import annotations

# 사업평가서 — business_evaluation.hwpx 표0 (12×4, secPr 문단 내)
EVALUATION_MAIN_TABLE_VALUES: dict[tuple[int, int], str] = {
    (0, 1): "team",
    (0, 3): "manager",
    (1, 1): "period",
    (1, 3): "evaluationDate",
    (2, 1): "programName",
    (2, 3): "target",
    (3, 1): "planCount",
    (3, 3): "planBudget",
    (4, 1): "actualCount",
    (4, 3): "actualExpense",
    (5, 1): "purpose",
    (5, 3): "goals",
    (6, 1): "performanceIndicator",
    (6, 3): "evaluationTool",
    (7, 2): "keyFactorAnalysis",
    (8, 2): "goalAppropriacy",
    (9, 2): "suggestion",
}

# 사업평가서 — 표1 (9×2) 사업계획 참고
EVALUATION_PLAN_REFERENCE_TABLE_VALUES: dict[tuple[int, int], str] = {
    (0, 1): "projectName",
    (1, 1): "purpose",
    (2, 1): "goals",
    (3, 1): "period",
    (4, 1): "target",
    (5, 1): "totalCount",
    (6, 1): "budget",
    (7, 1): "budgetCategory",
    (8, 1): "manager",
}

# 사업계획서 — business_plan.hwpx 표0 (15×3)
PLAN_MAIN_TABLE_VALUES: dict[tuple[int, int], str] = {
    (0, 1): "projectName",
    (1, 1): "purpose",
    (2, 1): "goals",
    (3, 1): "period",
    (4, 1): "target",
    (5, 1): "totalCount",
    (6, 1): "budget",
    (7, 1): "budgetCategory",
    (8, 1): "manager",
}

# 사업계획서 — 표1 (9×2) 대목차·목차·본문 — plan_table_ops.reference_values_from_sections
PLAN_REFERENCE_TABLE_VALUES: dict[tuple[int, int], str] = {}

# 사업계획서 표0 세부사업 행 (이름 col0, 내용 col2) — plan.hwpx row 11~14
PLAN_SUBPROJECT_ROWS: tuple[int, ...] = (11, 12, 13, 14)
