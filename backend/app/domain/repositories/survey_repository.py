from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class SurveyRecord:
    id: str
    region_id: str
    task_id: str | None
    detail: dict
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class SurveyResponseRecord:
    id: str
    survey_id: str
    region_id: str
    answers: dict
    submitted_at: datetime | None = None


class SurveyRepository(ABC):
    @abstractmethod
    def count_by_region(self, region_id: str) -> int: ...

    @abstractmethod
    def list_surveys(
        self,
        region_id: str,
        *,
        task_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ) -> list[SurveyRecord]: ...

    @abstractmethod
    def get_survey(self, region_id: str, survey_id: str) -> SurveyRecord | None: ...

    @abstractmethod
    def upsert_survey(
        self,
        region_id: str,
        survey_id: str,
        detail: dict,
        *,
        task_id: str | None = None,
    ) -> SurveyRecord: ...

    @abstractmethod
    def delete_survey(self, region_id: str, survey_id: str) -> bool: ...

    @abstractmethod
    def list_responses(self, region_id: str, survey_id: str) -> list[SurveyResponseRecord]: ...

    @abstractmethod
    def count_responses(self, region_id: str, survey_id: str) -> int: ...

    @abstractmethod
    def add_response(
        self,
        region_id: str,
        survey_id: str,
        *,
        response_id: str,
        answers: list[dict],
        submitted_at: datetime | None = None,
    ) -> SurveyResponseRecord: ...
