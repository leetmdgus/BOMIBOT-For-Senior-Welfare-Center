from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.core.datetime_kst import now_kst
from app.common.domain.repositories.survey_repository import (
    SurveyRecord,
    SurveyRepository,
    SurveyResponseRecord,
)


class SqlAlchemySurveyRepository(SurveyRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def count_by_region(self, region_id: str) -> int:
        from app.modules.survey.model import SurveyModel

        count = self._session.scalar(
            select(func.count())
            .select_from(SurveyModel)
            .where(SurveyModel.region_id == region_id)
        )
        return int(count or 0)

    def list_surveys(
        self,
        region_id: str,
        *,
        task_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ) -> list[SurveyRecord]:
        from app.modules.survey.model import SurveyModel

        stmt = select(SurveyModel).where(SurveyModel.region_id == region_id)
        if task_id:
            stmt = stmt.where(SurveyModel.task_id == task_id)
        rows = self._session.scalars(stmt.order_by(SurveyModel.updated_at.desc())).all()

        records = [self._to_record(row) for row in rows]
        if status and status not in ("all", "전체"):
            records = [
                row
                for row in records
                if self._status_key(row) == status
                or self._status_kr(row) == status
            ]
        if search:
            keyword = search.strip().lower()
            records = [
                row
                for row in records
                if keyword in self._title(row).lower()
                or keyword in self._program(row).lower()
            ]
        return records

    def get_survey(self, region_id: str, survey_id: str) -> SurveyRecord | None:
        from app.modules.survey.model import SurveyModel

        row = self._session.scalar(
            select(SurveyModel).where(
                SurveyModel.region_id == region_id,
                SurveyModel.id == survey_id,
            )
        )
        return self._to_record(row) if row else None

    def upsert_survey(
        self,
        region_id: str,
        survey_id: str,
        detail: dict,
        *,
        task_id: str | None = None,
    ) -> SurveyRecord:
        from app.modules.survey.model import SurveyModel

        row = self._session.get(SurveyModel, survey_id)
        linked_task = task_id or detail.get("taskId")
        if row is None or row.region_id != region_id:
            row = SurveyModel(
                id=survey_id,
                region_id=region_id,
                task_id=linked_task,
                detail=detail,
            )
            self._session.add(row)
        else:
            row.task_id = linked_task
            row.detail = detail
        self._session.flush()
        return self._to_record(row)

    def delete_survey(self, region_id: str, survey_id: str) -> bool:
        from app.modules.survey.model import SurveyModel

        row = self._session.scalar(
            select(SurveyModel).where(
                SurveyModel.region_id == region_id,
                SurveyModel.id == survey_id,
            )
        )
        if not row:
            return False
        self._session.delete(row)
        self._session.flush()
        return True

    def list_responses(self, region_id: str, survey_id: str) -> list[SurveyResponseRecord]:
        from app.modules.survey.model import SurveyResponseModel

        rows = self._session.scalars(
            select(SurveyResponseModel)
            .where(
                SurveyResponseModel.region_id == region_id,
                SurveyResponseModel.survey_id == survey_id,
            )
            .order_by(SurveyResponseModel.submitted_at.asc())
        ).all()
        return [self._to_response_record(row) for row in rows]

    def count_responses(self, region_id: str, survey_id: str) -> int:
        from app.modules.survey.model import SurveyResponseModel

        count = self._session.scalar(
            select(func.count())
            .select_from(SurveyResponseModel)
            .where(
                SurveyResponseModel.region_id == region_id,
                SurveyResponseModel.survey_id == survey_id,
            )
        )
        return int(count or 0)

    def add_response(
        self,
        region_id: str,
        survey_id: str,
        *,
        response_id: str,
        answers: list[dict],
        submitted_at: datetime | None = None,
    ) -> SurveyResponseRecord:
        from app.modules.survey.model import SurveyResponseModel

        row = SurveyResponseModel(
            id=response_id,
            region_id=region_id,
            survey_id=survey_id,
            answers={"answers": answers},
            submitted_at=submitted_at or now_kst(),
        )
        self._session.add(row)
        self._session.flush()
        return self._to_response_record(row)

    @staticmethod
    def _to_record(row) -> SurveyRecord:
        return SurveyRecord(
            id=row.id,
            region_id=row.region_id,
            task_id=row.task_id,
            detail=dict(row.detail or {}),
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    @staticmethod
    def _to_response_record(row) -> SurveyResponseRecord:
        payload = row.answers or {}
        answers = payload.get("answers") if isinstance(payload, dict) else payload
        return SurveyResponseRecord(
            id=row.id,
            survey_id=row.survey_id,
            region_id=row.region_id,
            answers={"answers": answers or []},
            submitted_at=row.submitted_at,
        )

    @staticmethod
    def _status_key(record: SurveyRecord) -> str:
        return str((record.detail.get("basicInfo") or {}).get("status") or "draft")

    @staticmethod
    def _status_kr(record: SurveyRecord) -> str:
        from app.modules.survey.survey_constants import STATUS_TO_KR

        return STATUS_TO_KR.get(SqlAlchemySurveyRepository._status_key(record), "임시")

    @staticmethod
    def _title(record: SurveyRecord) -> str:
        return str((record.detail.get("basicInfo") or {}).get("title") or "")

    @staticmethod
    def _program(record: SurveyRecord) -> str:
        basic = record.detail.get("basicInfo") or {}
        overview = record.detail.get("overview") or {}
        return str(basic.get("program") or overview.get("name") or "")
