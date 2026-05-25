from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class KanbanTaskRecord:
    id: str
    title: str
    description: str
    assignee: str
    completed_count: int | None = None
    total_count: int | None = None


@dataclass
class KanbanCategoryRecord:
    id: str
    title: str
    color: str
    tasks: list[KanbanTaskRecord] = field(default_factory=list)


@dataclass
class KanbanProjectRecord:
    id: str
    number: str
    title: str
    year: str
    team: str | None = None
    manager: str | None = None
    image: str | None = None
    categories: list[KanbanCategoryRecord] = field(default_factory=list)


class KanbanBoardRepository(ABC):
    @abstractmethod
    def list_projects(self, region_id: str, year: str) -> list[KanbanProjectRecord]: ...

    @abstractmethod
    def get_project(self, region_id: str, project_id: str) -> KanbanProjectRecord | None: ...

    @abstractmethod
    def count_projects(self, region_id: str, year: str) -> int: ...

    @abstractmethod
    def create_project(
        self,
        region_id: str,
        *,
        project_id: str,
        number: str,
        title: str,
        year: str,
        team: str | None,
        manager: str | None,
        image_url: str | None,
        categories: list[KanbanCategoryRecord],
    ) -> KanbanProjectRecord: ...

    @abstractmethod
    def update_project(
        self,
        region_id: str,
        project_id: str,
        *,
        title: str | None = None,
        number: str | None = None,
        team: str | None = None,
        manager: str | None = None,
        image_url: str | None = None,
        year: str | None = None,
    ) -> KanbanProjectRecord | None: ...

    @abstractmethod
    def delete_project(self, region_id: str, project_id: str) -> bool: ...

    @abstractmethod
    def create_task(
        self,
        region_id: str,
        project_id: str,
        category_id: str,
        task: KanbanTaskRecord,
    ) -> KanbanTaskRecord | None: ...

    @abstractmethod
    def update_task(
        self,
        region_id: str,
        project_id: str,
        category_id: str,
        task_id: str,
        *,
        title: str | None = None,
        description: str | None = None,
        assignee: str | None = None,
        completed_count: int | None = None,
        total_count: int | None = None,
    ) -> KanbanTaskRecord | None: ...

    @abstractmethod
    def delete_task(
        self,
        region_id: str,
        project_id: str,
        category_id: str,
        task_id: str,
    ) -> bool: ...

    @abstractmethod
    def move_task(
        self,
        region_id: str,
        project_id: str,
        task_id: str,
        *,
        from_category_id: str,
        to_category_id: str,
        over_task_id: str | None = None,
    ) -> KanbanTaskRecord | None: ...
