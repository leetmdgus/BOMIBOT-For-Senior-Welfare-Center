"""region_json_stores(survey) → PostgreSQL 1회 이관."""

from __future__ import annotations

import uuid
from copy import deepcopy

from app.application.survey_constants import KR_TO_STATUS
from app.domain.repositories.survey_repository import SurveyRepository
from app.infrastructure.persistence.repositories.sqlalchemy_json_store_repository import (
    SqlAlchemyJsonStoreRepository,
)

DOMAIN_SURVEY = "survey"


def _build_detail_from_list_item(item: dict) -> dict:
    status_key = KR_TO_STATUS.get(str(item.get("status", "")), "draft")
    return {
        "id": item.get("id"),
        "taskId": item.get("taskId"),
        "overview": {
            "purpose": [],
            "limitations": [],
            "name": item.get("program", ""),
            "startDate": item.get("date", ""),
            "endDate": item.get("endDate", ""),
            "target": "",
            "method": "",
            "staff": "",
            "sampleCount": str(item.get("totalTarget") or ""),
        },
        "basicInfo": {
            "title": item.get("title", ""),
            "description": "",
            "category": "만족도조사",
            "program": item.get("program", ""),
            "status": status_key,
        },
        "questions": [],
        "style": {"thankYouMessage": "응답해 주셔서 감사합니다."},
        "settings": {
            "acceptResponses": status_key == "active",
            "allowDuplicate": False,
            "showProgress": True,
        },
    }


def _resolve_detail(data: dict, survey_id: str) -> dict | None:
    runtime = data.get("runtime") or {}
    details = runtime.get("details") or {}
    if survey_id in details:
        return deepcopy(details[survey_id])

    details_mock = data.get("surveyDetailsMock") or {}
    if survey_id in details_mock:
        return deepcopy(details_mock[survey_id])

    list_item = next(
        (i for i in data.get("surveyListItemsMock", []) if i.get("id") == survey_id),
        None,
    )
    if list_item:
        return _build_detail_from_list_item(list_item)
    return None


def import_region_from_json_store(
    region_id: str,
    survey_repo: SurveyRepository,
    json_repo: SqlAlchemyJsonStoreRepository,
) -> int:
    if survey_repo.count_by_region(region_id) > 0:
        return 0

    payload = json_repo.get_payload(region_id, DOMAIN_SURVEY)
    if not payload:
        return 0

    imported = 0
    list_items = payload.get("surveyListItemsMock") or []
    seen: set[str] = set()

    for item in list_items:
        survey_id = str(item.get("id") or "").strip()
        if not survey_id or survey_id in seen:
            continue
        seen.add(survey_id)

        detail = _resolve_detail(payload, survey_id) or _build_detail_from_list_item(item)
        detail["id"] = survey_id
        if item.get("taskId"):
            detail["taskId"] = item["taskId"]

        survey_repo.upsert_survey(
            region_id,
            survey_id,
            detail,
            task_id=str(item.get("taskId") or "") or None,
        )
        imported += 1

    runtime = payload.get("runtime") or {}
    responses_map = runtime.get("responses") or {}
    for survey_id, rows in responses_map.items():
        if survey_id not in seen:
            detail = _resolve_detail(payload, survey_id)
            if detail:
                survey_repo.upsert_survey(region_id, survey_id, detail)
                seen.add(survey_id)
                imported += 1

        for row in rows or []:
            answers = row.get("answers") or []
            response_id = str(row.get("responseId") or f"resp-{uuid.uuid4().hex[:10]}")
            survey_repo.add_response(
                region_id,
                survey_id,
                response_id=response_id,
                answers=answers,
            )

    return imported
