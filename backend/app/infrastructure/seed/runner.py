"""Load frontend mock JSON into DB (both regions + admin accounts)."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.domain.region_store_domains import (
    DOMAIN_APPROVALS,
    DOMAIN_CHAT,
    DOMAIN_EBOOKS,
    DOMAIN_FILES,
    DOMAIN_ONTOLOGY,
    DOMAIN_PERFORMANCE,
    DOMAIN_REPORTS,
    DOMAIN_SURVEY,
    DOMAIN_TASK_DETAIL,
    DOMAIN_VERSION_HISTORY,
)
from app.infrastructure.persistence.models import (
    CalendarEventModel,
    DashboardProgressModel,
    DashboardStatModel,
    DepartmentModel,
    EmployeeModel,
    KanbanCategoryModel,
    KanbanProjectModel,
    KanbanTaskModel,
    LoginEventModel,
    RegionJsonStoreModel,
    RegionModel,
    SurveyModel,
    SurveyResponseModel,
    UserModel,
    VolunteerEventModel,
)

SEED_DIR = Path(__file__).resolve().parents[3] / "seed" / "data"

REGIONS = [
    {
        "id": "chuncheon-north",
        "label": "춘천 북부",
        "short_label": "북부",
        "org_name": "춘천북부노인복지관",
    },
    {
        "id": "chuncheon-east",
        "label": "춘천 동부",
        "short_label": "동부",
        "org_name": "춘천동부노인복지관",
    },
]

ADMIN_USERS = [
    {
        "id": "admin-north",
        "region_id": "chuncheon-north",
        "email": "admin@north.bomi.local",
        "password": "bomi-north-2026",
        "name": "이승현",
        "role_display": "관리자",
        "role_type": "admin",
        "department": "운영총괄",
        "employee_id": "chuncheon-north:emp-management-3",
        "profile_image_url": "/이승현_증명사진.jpg",
    },
    {
        "id": "admin-east",
        "region_id": "chuncheon-east",
        "email": "admin@east.bomi.local",
        "password": "bomi-east-2026",
        "name": "김동부",
        "role_display": "관리자",
        "role_type": "admin",
        "department": "운영총괄",
        "employee_id": "chuncheon-east:emp-management-3",
        "profile_image_url": None,
    },
]


def _load_json(name: str) -> dict | list:
    path = SEED_DIR / name
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _region_seed_prefix(region_id: str) -> str:
    return "" if region_id == "chuncheon-north" else f"{region_id}-"


def _load_region_json(region_id: str, base_name: str) -> dict | list:
    """Prefer region-specific seed file (e.g. chuncheon-east-organization.json)."""
    prefixed = f"{_region_seed_prefix(region_id)}{base_name}.json"
    if (SEED_DIR / prefixed).exists():
        return _load_json(prefixed)
    return _load_json(f"{base_name}.json")


def _scoped_id(region_id: str, raw_id: str) -> str:
    return f"{region_id}:{raw_id}"


def _sync_region_metadata(session: Session) -> None:
    for region in REGIONS:
        session.merge(
            RegionModel(
                id=region["id"],
                label=region["label"],
                short_label=region["short_label"],
                org_name=region["org_name"],
            )
        )


def seed_all(session: Session, *, force: bool = False) -> None:
    _sync_region_metadata(session)

    if force:
        _clear_region_scoped_tables(session)

    existing = session.scalar(select(RegionModel.id).limit(1))
    if existing and not force:
        session.commit()
        return

    chat_payload = _load_json("chat.json")
    ontology_payload = (
        _load_json("ontology.json") if (SEED_DIR / "ontology.json").exists() else None
    )

    for region in REGIONS:
        region_id = region["id"]
        _seed_organization(
            session, region_id, _load_region_json(region_id, "organization")
        )
        _seed_dashboard(session, region_id, _load_region_json(region_id, "dashboard"))
        _seed_kanban(session, region_id, _load_region_json(region_id, "kanban_projects"))
        _seed_region_json_stores(session, region_id, chat_payload, ontology_payload)

    # 관리자 계정은 users.employee_id → employees.id FK 이므로 직원 시드 이후에 생성
    # (직원 INSERT 전에 admin 을 flush 하면 FK 위반).
    session.flush()
    for admin in ADMIN_USERS:
        session.merge(
            UserModel(
                id=admin["id"],
                region_id=admin["region_id"],
                email=admin["email"],
                password_hash=hash_password(admin["password"]),
                name=admin["name"],
                role_display=admin["role_display"],
                role_type=admin["role_type"],
                department=admin["department"],
                employee_id=admin.get("employee_id"),
                profile_image_url=admin.get("profile_image_url"),
            )
        )

    session.commit()


def sync_organizations(session: Session) -> None:
    """조직현황 시드 JSON → DB (동부/북부 직원 목록 갱신)."""
    _sync_region_metadata(session)
    # users.employee_id → employees.id FK: 직원 삭제 전 참조 해제(아래 admin 머지에서 재설정).
    session.execute(update(UserModel).values(employee_id=None))
    session.flush()
    for region in REGIONS:
        region_id = region["id"]
        session.execute(delete(EmployeeModel).where(EmployeeModel.region_id == region_id))
        session.execute(delete(DepartmentModel).where(DepartmentModel.region_id == region_id))
        _seed_organization(
            session, region_id, _load_region_json(region_id, "organization")
        )
    # 직원 재생성 후 flush → 아래 admin.employee_id FK 충족
    session.flush()
    for admin in ADMIN_USERS:
        existing_user = session.get(UserModel, admin["id"])
        session.merge(
            UserModel(
                id=admin["id"],
                region_id=admin["region_id"],
                email=admin["email"],
                password_hash=(
                    existing_user.password_hash
                    if existing_user
                    else hash_password(admin["password"])
                ),
                name=admin["name"],
                role_display=admin["role_display"],
                role_type=admin["role_type"],
                department=admin["department"],
                employee_id=admin.get("employee_id"),
                profile_image_url=admin.get("profile_image_url"),
            )
        )
    session.commit()


def seed_missing_json_stores(session: Session) -> None:
    """Add JSON domains when DB already has regions (no --force)."""
    _sync_region_metadata(session)

    existing_region = session.scalar(select(RegionModel.id).limit(1))
    if not existing_region:
        session.commit()
        return

    chat_config = _load_json("chat.json") if (SEED_DIR / "chat.json").exists() else None
    ontology_graph = _load_json("ontology.json") if (SEED_DIR / "ontology.json").exists() else None

    for region in REGIONS:
        region_id = region["id"]
        for domain, base_name in JSON_STORE_SEEDS:
            exists = session.scalar(
                select(RegionJsonStoreModel.domain).where(
                    RegionJsonStoreModel.region_id == region_id,
                    RegionJsonStoreModel.domain == domain,
                )
            )
            if exists:
                continue
            payload = _load_region_json(region_id, base_name)
            session.merge(
                RegionJsonStoreModel(
                    region_id=region_id,
                    domain=domain,
                    payload=payload,
                )
            )
        if chat_config:
            exists = session.scalar(
                select(RegionJsonStoreModel.domain).where(
                    RegionJsonStoreModel.region_id == region_id,
                    RegionJsonStoreModel.domain == DOMAIN_CHAT,
                )
            )
            if not exists:
                session.merge(
                    RegionJsonStoreModel(
                        region_id=region_id,
                        domain=DOMAIN_CHAT,
                        payload=chat_config,
                    )
                )
        if ontology_graph:
            exists = session.scalar(
                select(RegionJsonStoreModel.domain).where(
                    RegionJsonStoreModel.region_id == region_id,
                    RegionJsonStoreModel.domain == DOMAIN_ONTOLOGY,
                )
            )
            if not exists:
                session.merge(
                    RegionJsonStoreModel(
                        region_id=region_id,
                        domain=DOMAIN_ONTOLOGY,
                        payload=ontology_graph,
                    )
                )
    session.commit()


def clear_performance_input_meta(session: Session) -> int:
    """기존 데이터 보존 — performance 페이로드의 세목/세세목 기본값만 비운다.

    performanceSubProjectChips(세목 칩)·defaultDetailCategories(세세목)만 []로
    덮어쓰고, 실적 행(inputManagementRows·runtime 버킷)과 기타 키는 그대로 둔다.
    이미 시드된 DB에 --force(전체 삭제) 없이 적용하기 위한 비파괴 마이그레이션.
    """
    rows = session.scalars(
        select(RegionJsonStoreModel).where(
            RegionJsonStoreModel.domain == DOMAIN_PERFORMANCE
        )
    ).all()

    updated = 0
    for row in rows:
        payload = dict(row.payload or {})
        had_values = bool(
            payload.get("performanceSubProjectChips")
            or payload.get("defaultDetailCategories")
        )
        payload["performanceSubProjectChips"] = []
        payload["defaultDetailCategories"] = []
        # JSON 컬럼은 in-place 변경을 추적하지 않으므로 속성을 재할당해 dirty 처리.
        row.payload = payload
        if had_values:
            updated += 1

    session.commit()
    return updated


JSON_STORE_SEEDS: list[tuple[str, str]] = [
    (DOMAIN_APPROVALS, "approvals"),
    (DOMAIN_EBOOKS, "ebooks"),
    (DOMAIN_FILES, "files"),
    (DOMAIN_SURVEY, "survey"),
    (DOMAIN_VERSION_HISTORY, "version_history"),
    (DOMAIN_PERFORMANCE, "performance"),
    (DOMAIN_TASK_DETAIL, "task_detail"),
    (DOMAIN_REPORTS, "reports"),
]


def _seed_region_json_stores(
    session: Session,
    region_id: str,
    chat_payload: dict,
    ontology_payload: dict | None = None,
) -> None:
    for domain, base_name in JSON_STORE_SEEDS:
        payload = _load_region_json(region_id, base_name)
        session.merge(
            RegionJsonStoreModel(
                region_id=region_id,
                domain=domain,
                payload=payload,
            )
        )
    session.merge(
        RegionJsonStoreModel(
            region_id=region_id,
            domain=DOMAIN_CHAT,
            payload=chat_payload,
        )
    )
    if ontology_payload is not None:
        session.merge(
            RegionJsonStoreModel(
                region_id=region_id,
                domain=DOMAIN_ONTOLOGY,
                payload=ontology_payload,
            )
        )


def _clear_region_scoped_tables(session: Session) -> None:
    # FK 의존성 순서(자식 → 부모)로 삭제. 누락/역순이면 ForeignKeyViolation 발생:
    #  login_events → users, users → employees, survey_responses → surveys 등.
    for model in (
        LoginEventModel,          # → users
        SurveyResponseModel,      # → surveys, regions
        SurveyModel,              # → regions
        KanbanTaskModel,          # → kanban_categories
        KanbanCategoryModel,      # → kanban_projects
        KanbanProjectModel,       # → regions
        RegionJsonStoreModel,     # → regions
        VolunteerEventModel,      # → regions
        CalendarEventModel,       # → regions
        DashboardProgressModel,   # → regions
        DashboardStatModel,       # → regions
        UserModel,                # → regions, employees (employees 보다 먼저)
        EmployeeModel,            # → regions, departments
        DepartmentModel,          # → regions
        # RegionModel 은 삭제하지 않음 — _sync_region_metadata 가 upsert.
        # 지우면 자식 재시드(employees·kanban 등)의 region FK 가 깨진다.
    ):
        session.execute(delete(model))


def _seed_organization(session: Session, region_id: str, departments: list) -> None:
    sort_order = 0
    # 회원가입에서 소속부서를 선택하지 않거나 매칭 부서가 없을 때 담길 "기타" 부서 보장.
    # (조직현황 소속부서 목록·회원가입 드롭다운에 항상 노출)
    session.merge(
        DepartmentModel(
            id=_scoped_id(region_id, "기타"),
            region_id=region_id,
            name="기타",
            employee_count=0,
            sort_order=900,
            is_aggregate=False,
        )
    )
    for dept in departments:
        dept_id = _scoped_id(region_id, dept["id"])
        session.merge(
            DepartmentModel(
                id=dept_id,
                region_id=region_id,
                name=dept["name"],
                employee_count=dept.get("count", 0),
                sort_order=sort_order,
                is_aggregate=dept["id"] == "all",
            )
        )
        sort_order += 1
        if dept["id"] == "all":
            continue
        for employee in dept.get("employees", []):
            join_raw = employee.get("joinDate") or employee.get("join_date")
            join_date = date.fromisoformat(join_raw) if join_raw else None
            session.merge(
                EmployeeModel(
                    id=_scoped_id(region_id, employee["id"]),
                    region_id=region_id,
                    department_id=dept_id,
                    name=employee["name"],
                    role=employee["role"],
                    position=employee["position"],
                    department_name=employee["department"],
                    email=employee["email"],
                    phone=employee["phone"],
                    join_date=join_date,
                    tenure=employee.get("tenure", ""),
                    last_login=employee.get("lastLogin", employee.get("last_login", "")),
                    is_admin=bool(employee.get("isAdmin") or employee.get("is_admin")),
                    is_team_leader=bool(
                        employee.get("isTeamLeader") or employee.get("is_team_leader")
                    ),
                    profile_image_url=employee.get("profileImage")
                    or employee.get("profile_image"),
                )
            )


def _seed_dashboard(session: Session, region_id: str, payload: dict) -> None:
    session.execute(delete(DashboardStatModel).where(DashboardStatModel.region_id == region_id))
    session.execute(
        delete(DashboardProgressModel).where(DashboardProgressModel.region_id == region_id)
    )
    session.execute(delete(CalendarEventModel).where(CalendarEventModel.region_id == region_id))
    session.execute(delete(VolunteerEventModel).where(VolunteerEventModel.region_id == region_id))

    for index, stat in enumerate(payload["stats"]):
        session.add(
            DashboardStatModel(
                region_id=region_id,
                sort_order=index,
                label=stat["label"],
                label_en=stat["labelEn"],
                value=stat["value"],
                unit=stat["unit"],
                description=stat["description"],
                icon_name=stat["iconName"],
                color=stat["color"],
                link=stat.get("link"),
                show_chart=bool(stat.get("showChart")),
                goto=stat.get("goto"),
            )
        )

    for index, item in enumerate(payload["progress"]):
        session.add(
            DashboardProgressModel(
                region_id=region_id,
                sort_order=index,
                label=item["label"],
                value=item["value"],
                icon_name=item["iconName"],
                color=item["color"],
                text_color=item["textColor"],
            )
        )

    for event in payload["calendarEvents"]:
        session.add(
            CalendarEventModel(
                region_id=region_id,
                day=event["day"],
                title=event["title"],
                color=event["color"],
                category=event["category"],
            )
        )

    for event in payload["volunteerEvents"]:
        session.merge(
            VolunteerEventModel(
                id=_scoped_id(region_id, event["id"]),
                region_id=region_id,
                name=event["name"],
                program=event["program"],
                day=event["day"],
                status=event["status"],
            )
        )


def _seed_kanban(session: Session, region_id: str, projects: list) -> None:
    session.execute(delete(KanbanProjectModel).where(KanbanProjectModel.region_id == region_id))

    for project in projects:
        project_id = _scoped_id(region_id, project["id"])
        session.add(
            KanbanProjectModel(
                id=project_id,
                region_id=region_id,
                number=project["number"],
                title=project["title"],
                team=project.get("team"),
                manager=project.get("manager"),
                image_url=project.get("image"),
                year=project["year"],
            )
        )
        for cat_order, category in enumerate(project.get("categories", [])):
            category_id = _scoped_id(region_id, category["id"])
            session.add(
                KanbanCategoryModel(
                    id=category_id,
                    project_id=project_id,
                    title=category["title"],
                    color=category["color"],
                    sort_order=cat_order,
                )
            )
            for task_order, task in enumerate(category.get("tasks", [])):
                task_id = _scoped_id(region_id, task["id"])
                session.add(
                    KanbanTaskModel(
                        id=task_id,
                        category_id=category_id,
                        title=task["title"],
                        description=task.get("description", ""),
                        assignee_name=task.get("assignee", ""),
                        completed_count=task.get("completedCount"),
                        total_count=task.get("totalCount"),
                        sort_order=task_order,
                    )
                )
