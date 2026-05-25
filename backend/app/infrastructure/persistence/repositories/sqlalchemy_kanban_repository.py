import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.domain.repositories.kanban_repository import (
    KanbanBoardRepository,
    KanbanCategoryRecord,
    KanbanProjectRecord,
    KanbanTaskRecord,
)
from app.domain.scoped_ids import scope_id, strip_scope
from app.infrastructure.kanban.static_config import COLUMN_COLORS, COLUMN_TYPES
from app.infrastructure.persistence.models.kanban import (
    KanbanCategoryModel,
    KanbanProjectModel,
    KanbanTaskModel,
)


class SqlAlchemyKanbanBoardRepository(KanbanBoardRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_projects(self, region_id: str, year: str) -> list[KanbanProjectRecord]:
        rows = self._query_projects(region_id, year).all()
        return [self._to_record(row) for row in rows]

    def get_project(self, region_id: str, project_id: str) -> KanbanProjectRecord | None:
        row = self._session.get(
            KanbanProjectModel,
            scope_id(region_id, project_id),
            options=[
                joinedload(KanbanProjectModel.categories).joinedload(KanbanCategoryModel.tasks)
            ],
        )
        return self._to_record(row) if row else None

    def count_projects(self, region_id: str, year: str) -> int:
        return int(
            self._session.scalar(
                select(func.count())
                .select_from(KanbanProjectModel)
                .where(
                    KanbanProjectModel.region_id == region_id,
                    KanbanProjectModel.year == year,
                )
            )
            or 0
        )

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
    ) -> KanbanProjectRecord:
        project = KanbanProjectModel(
            id=project_id,
            region_id=region_id,
            number=number,
            title=title,
            team=team,
            manager=manager,
            image_url=image_url,
            year=year,
        )
        self._session.add(project)
        for sort_order, category in enumerate(categories):
            cat_model = KanbanCategoryModel(
                id=category.id,
                project_id=project_id,
                title=category.title,
                color=category.color,
                sort_order=sort_order,
            )
            self._session.add(cat_model)
            for task_order, task in enumerate(category.tasks):
                self._session.add(
                    KanbanTaskModel(
                        id=task.id,
                        category_id=category.id,
                        title=task.title,
                        description=task.description,
                        assignee_name=task.assignee,
                        completed_count=task.completed_count,
                        total_count=task.total_count,
                        sort_order=task_order,
                    )
                )
        self._session.flush()
        self._session.refresh(project, attribute_names=["categories"])
        return self._to_record(project)

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
    ) -> KanbanProjectRecord | None:
        project = self._session.get(KanbanProjectModel, scope_id(region_id, project_id))
        if not project:
            return None
        if title is not None:
            project.title = title
        if number is not None:
            project.number = number
        if team is not None:
            project.team = team
        if manager is not None:
            project.manager = manager
        if image_url is not None:
            project.image_url = image_url
        if year is not None:
            project.year = year
        self._session.flush()
        return self.get_project(region_id, project_id)

    def delete_project(self, region_id: str, project_id: str) -> bool:
        project = self._session.get(KanbanProjectModel, scope_id(region_id, project_id))
        if not project:
            return False
        self._session.delete(project)
        self._session.flush()
        return True

    def create_task(
        self,
        region_id: str,
        project_id: str,
        category_id: str,
        task: KanbanTaskRecord,
    ) -> KanbanTaskRecord | None:
        category = self._session.get(
            KanbanCategoryModel, scope_id(region_id, category_id)
        )
        if not category or category.project_id != scope_id(region_id, project_id):
            return None
        max_order = self._session.scalar(
            select(func.coalesce(func.max(KanbanTaskModel.sort_order), -1)).where(
                KanbanTaskModel.category_id == category.id
            )
        )
        model = KanbanTaskModel(
            id=task.id,
            category_id=category.id,
            title=task.title,
            description=task.description,
            assignee_name=task.assignee,
            completed_count=task.completed_count,
            total_count=task.total_count,
            sort_order=int(max_order) + 1,
        )
        self._session.add(model)
        self._session.flush()
        return KanbanTaskRecord(
            id=model.id,
            title=model.title,
            description=model.description,
            assignee=model.assignee_name,
            completed_count=model.completed_count,
            total_count=model.total_count,
        )

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
    ) -> KanbanTaskRecord | None:
        task = self._session.get(KanbanTaskModel, scope_id(region_id, task_id))
        if not task:
            return None
        category = task.category
        if category.project_id != scope_id(region_id, project_id):
            return None
        if category.id != scope_id(region_id, category_id):
            return None
        if title is not None:
            task.title = title
        if description is not None:
            task.description = description
        if assignee is not None:
            task.assignee_name = assignee
        if completed_count is not None:
            task.completed_count = completed_count
        if total_count is not None:
            task.total_count = total_count
        self._session.flush()
        return KanbanTaskRecord(
            id=task.id,
            title=task.title,
            description=task.description,
            assignee=task.assignee_name,
            completed_count=task.completed_count,
            total_count=task.total_count,
        )

    def delete_task(
        self,
        region_id: str,
        project_id: str,
        category_id: str,
        task_id: str,
    ) -> bool:
        task = self._session.get(KanbanTaskModel, scope_id(region_id, task_id))
        if not task:
            return False
        category = task.category
        if category.project_id != scope_id(region_id, project_id):
            return False
        if category.id != scope_id(region_id, category_id):
            return False
        self._session.delete(task)
        self._session.flush()
        return True

    def move_task(
        self,
        region_id: str,
        project_id: str,
        task_id: str,
        *,
        from_category_id: str,
        to_category_id: str,
        over_task_id: str | None = None,
    ) -> KanbanTaskRecord | None:
        scoped_project_id = scope_id(region_id, project_id)
        scoped_task_id = scope_id(region_id, strip_scope(task_id))
        scoped_from_category_id = scope_id(region_id, strip_scope(from_category_id))
        scoped_to_category_id = scope_id(region_id, strip_scope(to_category_id))

        task = self._session.get(KanbanTaskModel, scoped_task_id)
        if not task or task.category.project_id != scoped_project_id:
            return None
        if task.category_id != scoped_from_category_id:
            return None

        to_category = self._session.get(KanbanCategoryModel, scoped_to_category_id)
        if not to_category or to_category.project_id != scoped_project_id:
            return None

        target_tasks = sorted(
            [
                item
                for item in to_category.tasks
                if item.id != task.id
            ],
            key=lambda item: item.sort_order,
        )

        insert_index = len(target_tasks)
        if over_task_id:
            scoped_over_id = scope_id(region_id, strip_scope(over_task_id))
            over_index = next(
                (index for index, item in enumerate(target_tasks) if item.id == scoped_over_id),
                None,
            )
            if over_index is not None:
                insert_index = over_index

        target_tasks.insert(insert_index, task)
        task.category_id = to_category.id

        for index, item in enumerate(target_tasks):
            item.sort_order = index

        self._session.flush()
        return KanbanTaskRecord(
            id=task.id,
            title=task.title,
            description=task.description,
            assignee=task.assignee_name,
            completed_count=task.completed_count,
            total_count=task.total_count,
        )

    def _query_projects(self, region_id: str, year: str):
        return self._session.scalars(
            select(KanbanProjectModel)
            .where(KanbanProjectModel.region_id == region_id, KanbanProjectModel.year == year)
            .options(
                joinedload(KanbanProjectModel.categories).joinedload(KanbanCategoryModel.tasks)
            )
            .order_by(KanbanProjectModel.number)
        ).unique()

    def _to_record(self, project: KanbanProjectModel) -> KanbanProjectRecord:
        categories = sorted(project.categories, key=lambda c: c.sort_order)
        return KanbanProjectRecord(
            id=project.id,
            number=project.number,
            title=project.title,
            year=project.year,
            team=project.team,
            manager=project.manager,
            image=project.image_url,
            categories=[
                KanbanCategoryRecord(
                    id=cat.id,
                    title=cat.title,
                    color=cat.color,
                    tasks=[
                        KanbanTaskRecord(
                            id=task.id,
                            title=task.title,
                            description=task.description,
                            assignee=task.assignee_name,
                            completed_count=task.completed_count,
                            total_count=task.total_count,
                        )
                        for task in sorted(cat.tasks, key=lambda t: t.sort_order)
                    ],
                )
                for cat in categories
            ],
        )

    @staticmethod
    def build_default_categories(region_id: str, project_id: str) -> list[KanbanCategoryRecord]:
        return [
            KanbanCategoryRecord(
                id=scope_id(region_id, f"{project_id}-cat-{title}"),
                title=title,
                color=COLUMN_COLORS[title],
                tasks=[],
            )
            for title in COLUMN_TYPES
        ]

    @staticmethod
    def new_task_id(region_id: str) -> str:
        return scope_id(region_id, f"task-{uuid.uuid4().hex[:8]}")
