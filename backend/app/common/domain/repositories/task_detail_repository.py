"""업무별 사업계획서·사업평가 — task_detail JSON runtime."""

from typing import Any, Protocol


class TaskDetailRepository(Protocol):
    def get_business_evaluation(
        self,
        region_id: str,
        task_id: str,
        *,
        card_title: str | None = None,
    ) -> dict: ...

    def save_business_evaluation(
        self,
        region_id: str,
        task_id: str,
        payload: dict,
        *,
        user: str = "시스템",
        card_title: str | None = None,
    ) -> dict: ...

    def complete_business_evaluation(
        self,
        region_id: str,
        task_id: str,
        *,
        user: str = "시스템",
        card_title: str | None = None,
    ) -> dict: ...

    def get_business_plan(
        self,
        region_id: str,
        task_id: str,
        *,
        card_title: str | None = None,
    ) -> dict: ...

    def save_business_plan(
        self,
        region_id: str,
        task_id: str,
        payload: dict,
        *,
        user: str = "시스템",
        card_title: str | None = None,
    ) -> dict: ...

    def save_task_documents(
        self,
        region_id: str,
        task_id: str,
        *,
        plan: dict | None = None,
        evaluation: dict | None = None,
        user: str = "시스템",
        card_title: str | None = None,
    ) -> dict[str, Any]: ...
