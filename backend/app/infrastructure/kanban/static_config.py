"""칸반 정적 설정 (프론트 kanban.board.mock.ts 와 동일)."""

from typing import Any

COLUMN_TYPES: tuple[str, ...] = ("실적관리", "사업계획", "만족도조사", "사업평가")

TASK_PATH_MAP: dict[str, str] = {
    "실적관리": "performance",
    "사업계획": "business-plan",
    "만족도조사": "survey",
    "사업평가": "evaluation",
}

CATEGORY_COLUMN_TYPE_MAP: dict[str, str] = {
    "실적관리": "실적관리",
    "사업계획": "사업계획",
    "사업계획서": "사업계획",
    "만족도조사": "만족도조사",
    "사업평가": "사업평가",
}

DEFAULT_COLUMN_TYPE = "실적관리"

STAFF: list[dict[str, str]] = [
    {"id": "1", "name": "김태민", "team": "복지 1팀", "position": "사회복지사"},
    {"id": "2", "name": "이창환", "team": "복지 1팀", "position": "사회복지사"},
    {"id": "3", "name": "이승현", "team": "복지 1팀", "position": "사회복지사"},
    {"id": "4", "name": "김영수", "team": "복지 2팀", "position": "사회복지사"},
    {"id": "5", "name": "박지연", "team": "복지 2팀", "position": "사회복지사"},
    {"id": "6", "name": "최민수", "team": "운영지원팀", "position": "사회복지사"},
]

PROJECT_IMAGE_OPTIONS: list[dict[str, str]] = [
    {"label": "상담", "value": "/Counseling-removebg-preview.png"},
    {"label": "교육", "value": "/Education-removebg-preview.png"},
    {"label": "건강", "value": "/Health-removebg-preview.png"},
    {"label": "돌봄", "value": "/Care-removebg-preview.png"},
    {"label": "지역사회", "value": "/Community-removebg-preview.png"},
]

COLUMN_COLORS: dict[str, str] = {
    "실적관리": "bg-success",
    "사업계획": "bg-primary",
    "만족도조사": "bg-accent",
    "사업평가": "bg-priority-high",
}


def column_type_for_category_title(title: str) -> str:
    return CATEGORY_COLUMN_TYPE_MAP.get(title.strip(), DEFAULT_COLUMN_TYPE)


def default_categories(project_id: str) -> list[dict[str, Any]]:
    return [
        {
            "id": f"{project_id}-cat-{col}",
            "title": col,
            "color": COLUMN_COLORS[col],
            "tasks": [],
        }
        for col in COLUMN_TYPES
    ]
