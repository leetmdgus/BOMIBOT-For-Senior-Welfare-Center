"""업무별 실적 입력 — performance JSON runtime.inputManagementByTaskId."""

from typing import Protocol


class PerformanceRepository(Protocol):
    def get_input_management_rows(
        self,
        region_id: str,
        task_id: str,
        *,
        task_title: str | None = None,
    ) -> list: ...

    def save_input_management_rows(
        self,
        region_id: str,
        rows: list,
        *,
        task_id: str,
        user: str = "시스템",
    ) -> dict: ...

    def get_performance_input_meta(self, region_id: str) -> dict: ...

    def get_performance_rows(
        self,
        region_id: str,
        *,
        project_id: str | None = None,
        month: str | None = None,
    ) -> dict: ...

    def get_monthly_plan(self, region_id: str, version: str = "기본계획") -> dict: ...

    def save_monthly_plan(self, region_id: str, version: str, body: dict) -> dict: ...
