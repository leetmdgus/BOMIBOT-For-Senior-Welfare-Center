"""칸반 업무(카드)별 사업계획·평가·만족도조사 초기 데이터."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.common.domain.scoped_ids import strip_scope

# 업무별 연결 설문 시드 ID (task_detail.json taskDetailSurveys)
TASK_SURVEY_IDS: dict[str, list[str]] = {
    "task1": ["1"],
    "task2": ["3"],
    "task3": ["3"],
    "task4": ["4"],
    "task5": ["2"],
    "task6": ["5"],
}


def normalize_task_id(task_id: str) -> str:
    return strip_scope(task_id.strip())


PERFORMANCE_MONTHS: tuple[str, ...] = tuple(f"{i}월" for i in range(1, 13))


def task_performance_seed_index(task_id: str) -> int:
    """업무 ID마다 안정적인 숫자 시드 (UUID형 task-0516816e 포함)."""
    tid = normalize_task_id(task_id)
    digits = "".join(character for character in tid if character.isdigit())
    if digits:
        return int(digits[-8:]) % 96 + 1
    return (sum(ord(character) for character in tid) % 96) + 1


def task_performance_seed_month(task_id: str) -> str:
    return PERFORMANCE_MONTHS[(task_performance_seed_index(task_id) - 1) % 12]


def business_name_for_task(task_id: str, *, card_title: str | None = None) -> str:
    """사업명 = 칸반 카드명(업무명)."""
    name = (card_title or "").strip()
    if name:
        return name
    return normalize_task_id(task_id)


def _empty_evaluation(title: str) -> dict:
    """신규 업무 평가서 — 사업명(=카드명)만 채우고 나머지는 빈 값으로 시작.

    계획/실행 인원·예산·지출은 실적관리 합계에서, 담당자는 카드에서 불러온다.
    의미 없는 자동 채움(성과지표·평가도구·요인분석 등)은 두지 않는다.
    """
    return {
        "team": "",
        "manager": "",
        "period": "",
        "programName": title,
        "target": "",
        "planCount": "",
        "planBudget": "",
        "actualCount": "",
        "actualExpense": "",
        "purpose": "",
        "goals": [],
        "performanceIndicator": "",
        "evaluationTool": "",
        "keyFactorAnalysis": "",
        "goalAppropriacy": "",
        "suggestion": "",
        "supervision": "",
        "evaluationDate": "",
        "isCompleted": False,
        "detailRows": [],
        "sections": [],
    }


def bootstrap_evaluation(
    data: dict,
    task_id: str,
    *,
    card_title: str | None = None,
) -> dict:
    """업무 평가서 초기 데이터.

    시드 예시 카드(사업명이 시드 예시와 동일)는 예시 데이터를 그대로 보존하고,
    그 외 신규 카드는 사업명만 채운 빈 평가서로 시작한다.
    """
    tid = normalize_task_id(task_id)
    title = business_name_for_task(tid, card_title=card_title)
    seed = data.get("businessEvaluationData", {})
    seed_name = str(seed.get("programName") or "").strip()
    if seed_name and title == seed_name:
        return deepcopy(seed)
    return _empty_evaluation(title)


def _empty_business_plan(title: str) -> dict:
    """신규 업무 사업계획서 — 사업명(=카드명)만 채운 빈 문서.

    세부사업·연인원/예산 등은 실적관리에서, 담당은 카드에서 불러온다.
    """
    return {
        "isCompleted": False,
        "sections": [],
        "formData": {
            "projectName": title,
            "purpose": "",
            "goals": [],
            "period": "",
            "target": "",
            "totalCount": "",
            "budget": "",
            "budgetCategory": "",
            "manager": "",
            "subProjects": [],
        },
    }


def bootstrap_business_plan(
    data: dict,
    task_id: str,
    *,
    card_title: str | None = None,
) -> dict:
    """업무 사업계획서 초기 데이터.

    시드 예시 카드(사업명이 시드 예시와 동일)는 예시 문서를 그대로 보존하고,
    그 외 신규 카드는 사업명만 채운 빈 문서로 시작한다.
    """
    tid = normalize_task_id(task_id)
    title = business_name_for_task(tid, card_title=card_title)
    source = data.get("businessPlan", {}).get("defaultBusinessPlanDocument", {})
    seed_form = source.get("formData") or {}
    seed_name = str(seed_form.get("projectName") or "").strip()
    if seed_name and title == seed_name:
        return deepcopy(source)
    return _empty_business_plan(title)


def bootstrap_task_surveys(
    data: dict,
    task_id: str,
    *,
    card_title: str | None = None,
) -> list[dict]:
    tid = normalize_task_id(task_id)
    catalog = {
        str(item.get("id")): deepcopy(item)
        for item in data.get("taskDetailSurveys") or data.get("surveyListItemsMock", [])
    }
    seed_ids = TASK_SURVEY_IDS.get(tid, [])
    title = business_name_for_task(tid, card_title=card_title)
    result: list[dict] = []
    for survey_id in seed_ids:
        item = catalog.get(survey_id)
        if not item:
            continue
        row = deepcopy(item)
        row["taskId"] = tid
        row["program"] = title
        if len(seed_ids) == 1:
            row["title"] = f"{title} 만족도 조사"
        result.append(row)
    if result:
        return result
    return [
        {
            "id": f"survey-{tid}-1",
            "title": f"{title} 만족도 조사",
            "program": title,
            "date": "",
            "status": "예정",
            "endDate": "",
            "taskId": tid,
        }
    ]


def survey_list_item_to_detail_fields(item: dict) -> dict[str, Any]:
    return {
        "id": item.get("id"),
        "title": item.get("title", ""),
        "program": item.get("program", ""),
        "date": item.get("date", ""),
        "status": item.get("status", ""),
        "endDate": item.get("endDate", ""),
    }
