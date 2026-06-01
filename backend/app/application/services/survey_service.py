"""만족도 조사 — PostgreSQL(surveys / survey_responses) + JSON 시드 이관."""

from __future__ import annotations

import uuid
from copy import deepcopy
from typing import Any

from fastapi import HTTPException, status

from app.application.survey_constants import STATUS_TO_KR
from app.application.survey_import import import_region_from_json_store
from app.application.survey_results import build_survey_results
from app.application.task_detail_bootstrap import (
    bootstrap_task_surveys,
    business_name_for_task,
    normalize_task_id,
)
from app.core.datetime_kst import format_kst_datetime, now_kst
from app.domain.region_store_domains import DOMAIN_SURVEY, DOMAIN_TASK_DETAIL
from app.domain.repositories.survey_repository import SurveyRecord, SurveyRepository
from app.domain.repositories.region_json_store_repository import (
    RegionJsonStoreRepository,
)


class SurveyService:
    def __init__(
        self,
        survey_repo: SurveyRepository,
        json_repo: RegionJsonStoreRepository | None = None,
    ) -> None:
        self._repo = survey_repo
        self._json = json_repo

    def _ensure_imported(self, region_id: str) -> None:
        if self._repo.count_by_region(region_id) > 0:
            return
        if self._json:
            import_region_from_json_store(region_id, self._repo, self._json)

    def _load_json_survey(self, region_id: str) -> dict | None:
        if not self._json:
            return None
        return self._json.get_payload(region_id, DOMAIN_SURVEY)

    def _load_json_task_detail(self, region_id: str) -> dict | None:
        if not self._json:
            return None
        return self._json.get_payload(region_id, DOMAIN_TASK_DETAIL)

    @staticmethod
    def _record_to_detail(record: SurveyRecord) -> dict:
        detail = deepcopy(record.detail)
        detail["id"] = record.id
        if record.task_id:
            detail["taskId"] = record.task_id
        return detail

    @staticmethod
    def _responses_as_payload(records: list) -> list[dict]:
        rows: list[dict] = []
        for record in records:
            answers = (record.answers or {}).get("answers", [])
            rows.append(
                {
                    "responseId": record.id,
                    "answers": deepcopy(answers),
                    "submittedAt": (
                        record.submitted_at.isoformat()
                        if record.submitted_at
                        else format_kst_datetime()
                    ),
                }
            )
        return rows

    def _record_to_list_item(
        self,
        record: SurveyRecord,
        *,
        responses: list[dict] | None = None,
    ) -> dict:
        detail = record.detail
        basic = detail.get("basicInfo") or {}
        overview = detail.get("overview") or {}
        status_key = str(basic.get("status") or "draft")

        item = {
            "id": record.id,
            "title": basic.get("title") or "",
            "program": basic.get("program") or overview.get("name") or "",
            "date": overview.get("startDate") or "",
            "status": STATUS_TO_KR.get(status_key, "임시"),
            "endDate": overview.get("endDate") or "",
            "taskId": record.task_id,
        }

        if responses is not None:
            results = build_survey_results(record.id, detail, responses, list_item=item)
            summary = results["summary"]
            item["responseCount"] = summary["totalResponses"]
            item["totalTarget"] = summary["totalTarget"]
            item["satisfaction"] = summary["averageSatisfaction"]
        return item

    def list_surveys(
        self,
        region_id: str,
        *,
        task_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ) -> list[dict]:
        self._ensure_imported(region_id)
        tid = normalize_task_id(task_id) if task_id else None
        records = self._repo.list_surveys(
            region_id, task_id=tid, status=status, search=search
        )
        items: list[dict] = []
        for record in records:
            responses = self._responses_as_payload(
                self._repo.list_responses(region_id, record.id)
            )
            items.append(self._record_to_list_item(record, responses=responses))
        return items

    def list_for_task(
        self,
        region_id: str,
        task_id: str,
        *,
        card_title: str | None = None,
    ) -> list[dict]:
        self._ensure_imported(region_id)
        tid = normalize_task_id(task_id)
        records = self._repo.list_surveys(region_id, task_id=tid)
        db_items = [
            self._record_to_list_item(
                record,
                responses=self._responses_as_payload(
                    self._repo.list_responses(region_id, record.id)
                ),
            )
            for record in records
        ]

        task_data = self._load_json_task_detail(region_id) or {}
        bootstrap_items = bootstrap_task_surveys(
            task_data, tid, card_title=card_title
        )

        seen = {item["id"] for item in db_items}
        merged = list(db_items)
        for item in bootstrap_items:
            if item["id"] not in seen:
                merged.append(item)
                seen.add(item["id"])
        return merged

    def get_survey_detail(
        self,
        region_id: str,
        survey_id: str,
        *,
        task_id: str | None = None,
    ) -> dict:
        if survey_id == "new":
            data = self._load_json_survey(region_id)
            template = deepcopy((data or {}).get("defaultSurveyTemplate") or {})
            if not template:
                raise HTTPException(status_code=404, detail="Survey template missing")
            if task_id:
                template["taskId"] = normalize_task_id(task_id)
                title = business_name_for_task(task_id, card_title=None)
                template.setdefault("basicInfo", {})["title"] = f"{title} 만족도 조사"
                template.setdefault("basicInfo", {})["program"] = title
                template.setdefault("overview", {})["name"] = title
            return template

        self._ensure_imported(region_id)
        record = self._repo.get_survey(region_id, survey_id)
        if not record:
            raise HTTPException(status_code=404, detail="Survey not found")

        detail = self._record_to_detail(record)
        if task_id and not detail.get("taskId"):
            detail["taskId"] = normalize_task_id(task_id)
        return detail

    def save_survey(
        self,
        region_id: str,
        survey_id: str,
        payload: dict,
        *,
        task_id: str | None = None,
    ) -> dict:
        self._ensure_imported(region_id)

        if survey_id == "new":
            data = self._load_json_survey(region_id)
            existing = deepcopy((data or {}).get("defaultSurveyTemplate") or {})
            if not existing:
                raise HTTPException(status_code=404, detail="Survey template missing")
            if task_id:
                existing["taskId"] = normalize_task_id(task_id)
        else:
            record = self._repo.get_survey(region_id, survey_id)
            if not record:
                raise HTTPException(status_code=404, detail="Survey not found")
            existing = self._record_to_detail(record)
            if task_id and not existing.get("taskId"):
                existing["taskId"] = normalize_task_id(task_id)

        next_id = (
            f"survey-{int(now_kst().timestamp() * 1000)}"
            if survey_id == "new"
            else survey_id
        )

        linked_task = (
            normalize_task_id(
                str(payload.get("taskId") or task_id or existing.get("taskId") or "")
            )
            or None
        )

        basic_info = {**existing.get("basicInfo", {}), **payload.get("basicInfo", {})}
        if payload.get("saveType") == "publish":
            basic_info["status"] = "active"
        elif payload.get("saveType") == "draft" and basic_info.get("status") == "active":
            basic_info["status"] = "draft"

        overview = {**existing.get("overview", {}), **payload.get("overview", {})}

        next_detail: dict[str, Any] = {
            **existing,
            "id": next_id,
            "taskId": linked_task,
            "overview": overview,
            "basicInfo": basic_info,
            "questions": payload.get("questions", existing.get("questions", [])),
            "style": {**existing.get("style", {}), **payload.get("style", {})}
            if payload.get("style")
            else existing.get("style", {}),
            "settings": {**existing.get("settings", {}), **payload.get("settings", {})}
            if payload.get("settings")
            else existing.get("settings", {}),
        }

        if payload.get("saveType") == "publish":
            next_detail.setdefault("settings", {})["acceptResponses"] = True

        self._repo.upsert_survey(
            region_id, next_id, next_detail, task_id=linked_task
        )

        return {
            "id": next_id,
            "savedAt": format_kst_datetime(),
            "status": next_detail.get("basicInfo", {}).get("status"),
        }

    def get_survey_results(self, region_id: str, survey_id: str) -> dict:
        self._ensure_imported(region_id)
        record = self._repo.get_survey(region_id, survey_id)
        if not record:
            raise HTTPException(status_code=404, detail="Survey not found")

        detail = self._record_to_detail(record)
        responses = self._responses_as_payload(
            self._repo.list_responses(region_id, survey_id)
        )
        list_item = self._record_to_list_item(record, responses=responses)

        results = build_survey_results(
            survey_id, detail, responses, list_item=list_item
        )

        if not responses:
            data = self._load_json_survey(region_id)
            results_mock = (data or {}).get("surveyResultsMock") or {}
            if survey_id in results_mock:
                return deepcopy(results_mock[survey_id])

        return results

    def _validate_response(self, detail: dict, payload: dict) -> None:
        questions = {str(q.get("id")): q for q in detail.get("questions") or []}
        answers = payload.get("answers") or []
        if not answers:
            raise HTTPException(status_code=400, detail="응답 항목이 비어 있습니다.")

        for entry in answers:
            qid = str(entry.get("questionId") or "")
            question = questions.get(qid)
            if not question or not question.get("required"):
                continue
            answer = entry.get("answer") or {}
            qtype = question.get("type")
            if qtype == "text" and not str(answer.get("value") or "").strip():
                raise HTTPException(
                    status_code=400,
                    detail=f"필수 문항입니다: {question.get('title', qid)}",
                )
            if qtype == "scale":
                score = answer.get("value")
                if not isinstance(score, (int, float)) or score < 1:
                    raise HTTPException(
                        status_code=400,
                        detail=f"필수 문항입니다: {question.get('title', qid)}",
                    )

    def submit_survey_response(self, region_id: str, survey_id: str, payload: dict) -> dict:
        if survey_id == "new":
            raise HTTPException(status_code=400, detail="저장된 설문이 아닙니다.")

        self._ensure_imported(region_id)
        record = self._repo.get_survey(region_id, survey_id)
        if not record:
            raise HTTPException(status_code=404, detail="Survey not found")

        detail = self._record_to_detail(record)
        settings = detail.get("settings", {})
        basic = detail.get("basicInfo", {})
        if not settings.get("acceptResponses") or basic.get("status") != "active":
            raise HTTPException(status_code=400, detail="응답을 받을 수 없는 설문입니다.")

        if not settings.get("allowDuplicate") and self._repo.count_responses(
            region_id, survey_id
        ):
            raise HTTPException(
                status_code=400,
                detail="이미 응답이 등록된 설문입니다. 중복 응답은 허용되지 않습니다.",
            )

        self._validate_response(detail, payload)

        response_id = f"resp-{uuid.uuid4().hex[:10]}"
        submitted_at = now_kst()
        self._repo.add_response(
            region_id,
            survey_id,
            response_id=response_id,
            answers=deepcopy(payload.get("answers", [])),
            submitted_at=submitted_at,
        )

        thank_you = detail.get("style", {}).get("thankYouMessage", "감사합니다.")
        return {
            "responseId": response_id,
            "submittedAt": format_kst_datetime(submitted_at),
            "message": thank_you,
        }

    def delete_survey(self, region_id: str, survey_id: str) -> dict:
        if survey_id == "new":
            raise HTTPException(status_code=400, detail="Cannot delete unsaved survey")

        self._ensure_imported(region_id)
        if not self._repo.delete_survey(region_id, survey_id):
            raise HTTPException(status_code=404, detail="Survey not found")

        return {"success": True, "deletedId": survey_id}

    def close_survey(self, region_id: str, survey_id: str) -> dict:
        self._ensure_imported(region_id)
        record = self._repo.get_survey(region_id, survey_id)
        if not record:
            raise HTTPException(status_code=404, detail="Survey not found")

        detail = self._record_to_detail(record)
        detail.setdefault("basicInfo", {})["status"] = "closed"
        detail.setdefault("settings", {})["acceptResponses"] = False
        self._repo.upsert_survey(region_id, survey_id, detail, task_id=record.task_id)
        return {"id": survey_id, "status": "closed"}

    def duplicate_survey(self, region_id: str, survey_id: str) -> dict:
        self._ensure_imported(region_id)
        record = self._repo.get_survey(region_id, survey_id)
        if not record:
            raise HTTPException(status_code=404, detail="Survey not found")

        source = deepcopy(self._record_to_detail(record))
        new_id = f"survey-{int(now_kst().timestamp() * 1000)}"
        source["id"] = new_id
        source.setdefault("basicInfo", {})["status"] = "draft"
        source.setdefault("basicInfo", {})["title"] = (
            f"{source.get('basicInfo', {}).get('title', '설문')} (복사)"
        )
        source.setdefault("settings", {})["acceptResponses"] = False

        self._repo.upsert_survey(
            region_id,
            new_id,
            source,
            task_id=record.task_id,
        )
        return {"id": new_id, "status": "draft"}
