"""칸반 업무(카드)별 사업계획·평가·만족도조사 초기 데이터."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.application.hwpx.render.template_defaults import get_plan_template_defaults
from app.domain.scoped_ids import strip_scope

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


def bootstrap_evaluation(
    data: dict,
    task_id: str,
    *,
    card_title: str | None = None,
) -> dict:
    tid = normalize_task_id(task_id)
    base = deepcopy(data.get("businessEvaluationData", {}))
    title = business_name_for_task(tid, card_title=card_title)
    base["programName"] = title
    base["performanceIndicator"] = f"{title} 핵심 성과지표"
    base["evaluationTool"] = f"{title} 만족도·성과 설문"
    base["keyFactorAnalysis"] = f"{title} 추진 시 핵심 요인 분석"
    base["goalAppropriacy"] = f"{title} 목표 적절성 검토"
    base["suggestion"] = f"{title} 차년도 개선·확대 제안"
    if base.get("detailRows"):
        first = base["detailRows"][0]
        first["content"] = f"{title} 관련 {first.get('label', '추진내용')}"
    return base


def bootstrap_business_plan(
    data: dict,
    task_id: str,
    *,
    card_title: str | None = None,
) -> dict:
    tid = normalize_task_id(task_id)
    source = data.get("businessPlan", {}).get("defaultBusinessPlanDocument", {})
    doc = deepcopy(source)
    title = business_name_for_task(tid, card_title=card_title)
    form = doc.setdefault("formData", {})
    form["projectName"] = title
    if not str(form.get("purpose") or "").strip():
        form["purpose"] = (
            f"{title} 대상자에게 맞춤형 서비스를 제공하고 "
            "사업 목표 달성을 위한 연간 추진 계획"
        )
    if not form.get("goals"):
        form["goals"] = [
            f"{title} 목표 {index + 1}" for index in range(3)
        ]
    if not form.get("subProjects"):
        template_subs = get_plan_template_defaults().get("subProjects") or []
        if template_subs:
            form["subProjects"] = deepcopy(template_subs)
        else:
            default_form = source.get("formData") or {}
            form["subProjects"] = deepcopy(default_form.get("subProjects") or [])
    return doc


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
