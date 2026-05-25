import uuid
from datetime import UTC, datetime

from app.domain.repositories.kanban_repository import (
    KanbanBoardRepository,
    KanbanCategoryRecord,
    KanbanProjectRecord,
    KanbanTaskRecord,
)
from app.domain.scoped_ids import scope_id, strip_scope
from app.infrastructure.kanban import static_config
from app.infrastructure.persistence.repositories.sqlalchemy_kanban_repository import (
    SqlAlchemyKanbanBoardRepository,
)


class KanbanBoardService:
    def __init__(
        self,
        kanban_repo: KanbanBoardRepository,
        region_store: "RegionStoreService | None" = None,
    ) -> None:
        self._kanban_repo = kanban_repo
        self._region_store = region_store

    def resolve_project_year(self, region_id: str, project_id: str) -> str:
        project = self._kanban_repo.get_project(region_id, project_id)
        if project and project.year:
            return str(project.year)
        return str(datetime.now(UTC).year)

    def _log_version(
        self,
        region_id: str,
        *,
        action: str,
        target: str,
        action_type: str,
        project_name: str = "",
        user: str = "시스템",
        year: str | None = None,
        changes: list[dict] | None = None,
        can_restore: bool = False,
        meta: dict | None = None,
    ) -> None:
        if self._region_store:
            self._region_store.append_version_entry(
                region_id,
                action=action,
                target=target,
                action_type=action_type,
                project_name=project_name,
                user=user,
                year=year,
                changes=changes,
                can_restore=can_restore,
                meta=meta,
            )

    @staticmethod
    def _change_before(changes: list[dict], label: str) -> str | None:
        for change in changes:
            if change.get("label") == label:
                return change.get("before")
        return None

    def _resolve_task_location(
        self,
        region_id: str,
        *,
        project_id: str | None,
        task_id: str | None,
        category_id: str | None,
        project_name: str = "",
        task_title: str = "",
    ) -> tuple[str | None, str | None, str | None]:
        if project_id:
            project = self._kanban_repo.get_project(region_id, project_id)
        elif project_name:
            year = str(datetime.now(UTC).year)
            matches = [
                p
                for p in self._kanban_repo.list_projects(region_id, year)
                if p.title == project_name
            ]
            project = matches[0] if matches else None
        else:
            project = None

        if not project:
            return None, None, None

        scoped_project_id = project.id
        if task_id and category_id:
            return scoped_project_id, category_id, task_id

        needle = task_title or ""
        for category in project.categories:
            for task in category.tasks:
                if strip_scope(task.id) == strip_scope(task_id or "") or (
                    needle and task.title == needle
                ):
                    return scoped_project_id, strip_scope(category.id), strip_scope(task.id)
        return scoped_project_id, None, None

    def restore_version_entry(
        self, region_id: str, history_id: str, *, user: str = "시스템"
    ) -> dict:
        if not self._region_store:
            return {
                "success": False,
                "historyId": history_id,
                "message": "버전 저장소가 연결되지 않았습니다.",
            }

        entry, _restored_ids = self._region_store.get_version_entry(region_id, history_id)
        if not entry:
            return {
                "success": False,
                "historyId": history_id,
                "message": "해당 이력을 찾을 수 없습니다.",
            }
        if not entry.get("canRestore"):
            return {
                "success": False,
                "historyId": history_id,
                "message": "복원할 수 없는 이력입니다.",
            }

        action_type = str(entry.get("actionType", ""))
        changes = list(entry.get("changes") or [])
        meta = dict(entry.get("meta") or {})
        project_id = meta.get("projectId")
        task_id = meta.get("taskId")
        category_id = meta.get("categoryId")
        project_name = str(entry.get("projectName") or "")
        target = str(entry.get("target") or "")
        year = str(meta.get("year") or entry.get("year") or datetime.now(UTC).year)

        resolved_project_id, resolved_category_id, resolved_task_id = self._resolve_task_location(
            region_id,
            project_id=project_id,
            task_id=task_id,
            category_id=category_id,
            project_name=project_name,
            task_title=target,
        )

        applied = False

        if action_type == "update_project" and resolved_project_id:
            before_title = self._change_before(changes, "제목")
            if before_title is not None:
                self._kanban_repo.update_project(
                    region_id, resolved_project_id, title=before_title
                )
                applied = True

        elif action_type in {
            "update_title",
            "update_description",
            "update_assignee",
        } and resolved_project_id and resolved_category_id and resolved_task_id:
            if action_type == "update_title":
                before = self._change_before(changes, "제목")
                if before is not None:
                    self._kanban_repo.update_task(
                        region_id,
                        resolved_project_id,
                        resolved_category_id,
                        resolved_task_id,
                        title=before,
                    )
                    applied = True
            elif action_type == "update_description":
                before = self._change_before(changes, "설명")
                if before is not None:
                    self._kanban_repo.update_task(
                        region_id,
                        resolved_project_id,
                        resolved_category_id,
                        resolved_task_id,
                        description=before,
                    )
                    applied = True
            elif action_type == "update_assignee":
                before = self._change_before(changes, "담당자")
                if before is not None:
                    self._kanban_repo.update_task(
                        region_id,
                        resolved_project_id,
                        resolved_category_id,
                        resolved_task_id,
                        assignee=before,
                    )
                    applied = True

        elif action_type == "move_card" and resolved_project_id and resolved_task_id:
            from_category_id = meta.get("fromCategoryId")
            to_category_id = meta.get("toCategoryId")
            if from_category_id and to_category_id:
                self._kanban_repo.move_task(
                    region_id,
                    resolved_project_id,
                    resolved_task_id,
                    from_category_id=str(to_category_id),
                    to_category_id=str(from_category_id),
                )
                applied = True

        if not applied:
            return {
                "success": False,
                "historyId": history_id,
                "message": "복원할 데이터를 적용하지 못했습니다. (메타데이터 없음)",
            }

        self._region_store.mark_version_restored(region_id, history_id)
        self._log_version(
            region_id,
            action="이전 버전으로 복원했습니다.",
            target=target,
            action_type="update_title",
            project_name=project_name,
            user=user,
            year=year,
            can_restore=False,
            meta={
                "projectId": strip_scope(resolved_project_id or ""),
                "restoredFrom": history_id,
            },
        )

        return {
            "success": True,
            "historyId": history_id,
            "message": f'"{target}" 항목을 복원했습니다.',
            "projectId": strip_scope(resolved_project_id or ""),
            "year": year,
        }

    @staticmethod
    def _find_task_context(
        project: KanbanProjectRecord | None, task_id: str
    ) -> tuple[KanbanCategoryRecord | None, KanbanTaskRecord | None]:
        if not project:
            return None, None
        for category in project.categories:
            for task in category.tasks:
                if strip_scope(task.id) == strip_scope(task_id):
                    return category, task
        return None, None

    def list_projects(self, region_id: str, year: str) -> list[dict]:
        projects = self._kanban_repo.list_projects(region_id, year)
        return [self._project_payload(p) for p in projects]

    def create_project(
        self, region_id: str, body: dict, *, user: str = "시스템"
    ) -> dict:
        raw_project_id = f"proj-{uuid.uuid4().hex[:8]}"
        scoped_project_id = scope_id(region_id, raw_project_id)
        assignees = body.get("assignees") or []
        manager = None
        team = None
        if assignees:
            first = assignees[0]
            manager = first.get("name")
            team = first.get("team")
        year = str(body.get("year") or datetime.now(UTC).year)
        count = self._kanban_repo.count_projects(region_id, year)
        categories = SqlAlchemyKanbanBoardRepository.build_default_categories(
            region_id, raw_project_id
        )
        task_title = (body.get("title") or body.get("project_name") or "").strip()
        if task_title and categories:
            first_cat = categories[0]
            first_cat.tasks.append(
                KanbanTaskRecord(
                    id=SqlAlchemyKanbanBoardRepository.new_task_id(region_id),
                    title=task_title,
                    description=body.get("description") or "",
                    assignee=assignees[0].get("name", "") if assignees else "",
                    completed_count=0,
                    total_count=0,
                )
            )

        self._kanban_repo.create_project(
            region_id,
            project_id=scoped_project_id,
            number=str(count + 1).zfill(2),
            title=body.get("project_name") or body.get("title") or "새 프로젝트",
            year=year,
            team=team,
            manager=manager,
            image_url=body.get("project_image"),
            categories=categories,
        )
        title = body.get("project_name") or body.get("title") or "새 프로젝트"
        self._log_version(
            region_id,
            action="프로젝트를 생성했습니다.",
            target=title,
            action_type="create_project",
            project_name=title,
            user=user,
            year=year,
            meta={"projectId": strip_scope(scoped_project_id), "year": year},
        )
        now = datetime.now(UTC).isoformat()
        return {
            "id": raw_project_id,
            "assignees": assignees,
            "description": body.get("description") or "",
            "project_image": body.get("project_image"),
            "project_name": body.get("project_name") or "",
            "title": body.get("title") or "",
            "created_at": now,
            "updated_at": now,
        }

    def update_project(
        self,
        region_id: str,
        project_id: str,
        body: dict,
        *,
        user: str = "시스템",
    ) -> dict | None:
        existing = self._kanban_repo.get_project(region_id, project_id)
        updated = self._kanban_repo.update_project(
            region_id,
            project_id,
            title=body.get("title"),
            number=body.get("number"),
            team=body.get("team"),
            manager=body.get("manager"),
            image_url=body.get("image"),
            year=body.get("year"),
        )
        if updated:
            before_title = existing.title if existing else updated.title
            self._log_version(
                region_id,
                action="프로젝트를 수정했습니다.",
                target=updated.title,
                action_type="update_project",
                project_name=updated.title,
                user=user,
                year=str(updated.year),
                changes=[
                    {
                        "label": "제목",
                        "before": before_title,
                        "after": updated.title,
                    }
                ],
                can_restore=True,
                meta={
                    "projectId": strip_scope(project_id),
                    "year": str(updated.year),
                },
            )
        return self._project_payload(updated) if updated else None

    def delete_project(
        self, region_id: str, project_id: str, *, user: str = "시스템"
    ) -> bool:
        existing = self._kanban_repo.get_project(region_id, project_id)
        deleted = self._kanban_repo.delete_project(region_id, project_id)
        if deleted and existing:
            self._log_version(
                region_id,
                action="프로젝트를 삭제했습니다.",
                target=existing.title,
                action_type="update_project",
                project_name=existing.title,
                user=user,
                year=str(existing.year),
                meta={"projectId": strip_scope(project_id), "year": str(existing.year)},
            )
        return deleted

    def create_task(
        self,
        region_id: str,
        project_id: str,
        category_id: str,
        body: dict,
        *,
        user: str = "시스템",
    ) -> dict | None:
        project = self._kanban_repo.get_project(region_id, project_id)
        record = KanbanTaskRecord(
            id=SqlAlchemyKanbanBoardRepository.new_task_id(region_id),
            title=body.get("title", ""),
            description=body.get("description", ""),
            assignee=body.get("assignee", ""),
            completed_count=body.get("completedCount"),
            total_count=body.get("totalCount"),
        )
        created = self._kanban_repo.create_task(
            region_id, project_id, category_id, record
        )
        if created:
            project_name = project.title if project else ""
            project_year = str(project.year) if project else str(datetime.now(UTC).year)
            self._log_version(
                region_id,
                action="업무를 추가했습니다.",
                target=created.title,
                action_type="create_task",
                project_name=project_name,
                user=user,
                year=project_year,
                meta={
                    "projectId": strip_scope(project_id),
                    "categoryId": strip_scope(category_id),
                    "taskId": strip_scope(created.id),
                    "year": project_year,
                },
            )
        return self._task_payload(created) if created else None

    def update_task(
        self,
        region_id: str,
        project_id: str,
        category_id: str,
        task_id: str,
        body: dict,
        *,
        user: str = "시스템",
    ) -> dict | None:
        project = self._kanban_repo.get_project(region_id, project_id)
        _, existing = self._find_task_context(project, task_id)

        updated = self._kanban_repo.update_task(
            region_id,
            project_id,
            category_id,
            task_id,
            title=body.get("title"),
            description=body.get("description"),
            assignee=body.get("assignee"),
            completed_count=body.get("completedCount"),
            total_count=body.get("totalCount"),
        )
        if updated and existing:
            project_name = project.title if project else ""
            changes: list[dict] = []
            action_type = "update_title"
            action = "카드 제목을 수정했습니다."

            if body.get("title") is not None and body.get("title") != existing.title:
                changes.append(
                    {
                        "label": "제목",
                        "before": existing.title,
                        "after": updated.title,
                    }
                )
            elif (
                body.get("description") is not None
                and body.get("description") != existing.description
            ):
                action_type = "update_description"
                action = "카드 설명을 수정했습니다."
                changes.append(
                    {
                        "label": "설명",
                        "before": existing.description,
                        "after": updated.description,
                    }
                )
            elif body.get("assignee") is not None and body.get("assignee") != existing.assignee:
                action_type = "update_assignee"
                action = "담당자를 변경했습니다."
                changes.append(
                    {
                        "label": "담당자",
                        "before": existing.assignee,
                        "after": updated.assignee,
                    }
                )
            else:
                changes.append(
                    {
                        "label": "제목",
                        "before": existing.title,
                        "after": updated.title,
                    }
                )

            project_year = str(project.year) if project else str(datetime.now(UTC).year)
            self._log_version(
                region_id,
                action=action,
                target=updated.title,
                action_type=action_type,
                project_name=project_name,
                user=user,
                year=project_year,
                changes=changes,
                can_restore=True,
                meta={
                    "projectId": strip_scope(project_id),
                    "categoryId": strip_scope(category_id),
                    "taskId": strip_scope(task_id),
                    "year": project_year,
                },
            )
        return self._task_payload(updated) if updated else None

    def delete_task(
        self,
        region_id: str,
        project_id: str,
        category_id: str,
        task_id: str,
        *,
        user: str = "시스템",
    ) -> bool:
        project = self._kanban_repo.get_project(region_id, project_id)
        _, existing = self._find_task_context(project, task_id)
        deleted = self._kanban_repo.delete_task(
            region_id, project_id, category_id, task_id
        )
        if deleted:
            target = existing.title if existing else task_id
            project_name = project.title if project else ""
            project_year = str(project.year) if project else str(datetime.now(UTC).year)
            self._log_version(
                region_id,
                action="업무를 삭제했습니다.",
                target=target,
                action_type="delete_task",
                project_name=project_name,
                user=user,
                year=project_year,
                meta={
                    "projectId": strip_scope(project_id),
                    "categoryId": strip_scope(category_id),
                    "taskId": strip_scope(task_id),
                    "year": project_year,
                },
            )
        return deleted

    def move_task(
        self,
        region_id: str,
        project_id: str,
        body: dict,
        *,
        user: str = "시스템",
    ) -> dict | None:
        task_id = body.get("taskId")
        from_category_id = body.get("fromCategoryId")
        to_category_id = body.get("toCategoryId")
        over_task_id = body.get("overTaskId")

        if not task_id or not from_category_id or not to_category_id:
            return None

        project = self._kanban_repo.get_project(region_id, project_id)
        from_category, existing = self._find_task_context(project, task_id)
        if not existing or not from_category:
            return None

        scoped_to_category_id = strip_scope(str(to_category_id))
        to_category = next(
            (
                category
                for category in (project.categories if project else [])
                if strip_scope(category.id) == scoped_to_category_id
            ),
            None,
        )
        if not to_category:
            return None

        scoped_from_category_id = strip_scope(str(from_category_id))
        moved = self._kanban_repo.move_task(
            region_id,
            project_id,
            task_id,
            from_category_id=scoped_from_category_id,
            to_category_id=scoped_to_category_id,
            over_task_id=over_task_id,
        )
        if not moved:
            return None

        project_name = project.title if project else ""
        project_year = str(project.year) if project else str(datetime.now(UTC).year)
        same_column = scoped_from_category_id == scoped_to_category_id
        self._log_version(
            region_id,
            action=(
                "카드 순서를 변경했습니다."
                if same_column
                else "카드를 다른 칸반으로 이동했습니다."
            ),
            target=moved.title,
            action_type="move_card",
            project_name=project_name,
            user=user,
            year=project_year,
            changes=[
                {
                    "label": "순서" if same_column else "칸반",
                    "before": from_category.title,
                    "after": to_category.title,
                }
            ],
            can_restore=True,
            meta={
                "projectId": strip_scope(project_id),
                "taskId": strip_scope(task_id),
                "fromCategoryId": scoped_from_category_id,
                "toCategoryId": scoped_to_category_id,
                "overTaskId": strip_scope(over_task_id) if over_task_id else None,
                "year": project_year,
            },
        )
        return self._task_payload(moved)

    @staticmethod
    def get_staff() -> list[dict]:
        return static_config.STAFF

    @staticmethod
    def get_column_types() -> list[str]:
        return list(static_config.COLUMN_TYPES)

    @staticmethod
    def get_task_path_map() -> dict[str, str]:
        return static_config.TASK_PATH_MAP

    @staticmethod
    def get_project_image_options() -> list[dict]:
        return static_config.PROJECT_IMAGE_OPTIONS

    @staticmethod
    def get_column_type_by_title(title: str) -> str:
        return static_config.column_type_for_category_title(title)

    def _project_payload(self, project) -> dict:
        return {
            "id": strip_scope(project.id),
            "number": project.number,
            "title": project.title,
            "team": project.team,
            "manager": project.manager,
            "image": project.image,
            "year": project.year,
            "categories": [
                {
                    "id": strip_scope(cat.id),
                    "title": cat.title,
                    "color": cat.color,
                    "tasks": [self._task_payload(t) for t in cat.tasks],
                }
                for cat in project.categories
            ],
        }

    @staticmethod
    def _task_payload(task: KanbanTaskRecord) -> dict:
        return {
            "id": strip_scope(task.id),
            "title": task.title,
            "description": task.description,
            "assignee": task.assignee,
            "completedCount": task.completed_count,
            "totalCount": task.total_count,
        }
