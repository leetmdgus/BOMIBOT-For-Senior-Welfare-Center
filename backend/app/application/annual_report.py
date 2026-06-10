"""연간 보고서(전자책자) 자동 기입 — 사업계획·만족도조사·사업평가 완료 시
해당 연도의 `{연도}_사업보고서` 책자에 사업(업무)별 항목을 누적한다.

전자책자 도메인(DOMAIN_EBOOKS) payload 위에서 동작하는 순수 함수 모음.
RegionStoreService 가 _load/_save 로 감싸 호출한다.
"""

from __future__ import annotations

from typing import Any

# 자동 생성 책자의 카테고리/발행부서 기본값 (전자책자 기존 카테고리와 동일)
ANNUAL_REPORT_CATEGORY = "운영보고서"
ANNUAL_REPORT_TEAM = "연간보고서"
ANNUAL_REPORT_THUMBNAIL = "/placeholder.svg"

# 사업별 항목에 채워지는 문서 종류
DOCUMENT_KINDS = ("plan", "survey", "evaluation")
KIND_LABELS = {
    "plan": "사업계획서",
    "survey": "만족도조사 결과",
    "evaluation": "사업평가서",
}


def annual_report_title(year: str | int) -> str:
    """예: 2026 → '2026_사업보고서'."""
    return f"{year}_사업보고서"


def find_report_book(data: dict, year: str | int) -> dict | None:
    title = annual_report_title(year)
    for book in data.get("booksData", []):
        if isinstance(book, dict) and book.get("title") == title:
            return book
    return None


def find_or_create_report_book(
    data: dict,
    year: str | int,
    *,
    book_id: str,
    now_iso: str,
) -> dict:
    """연도별 사업보고서 책자를 찾고, 없으면 새로 만들어 반환한다."""
    existing = find_report_book(data, year)
    if existing is not None:
        existing.setdefault("entries", [])
        return existing

    book: dict[str, Any] = {
        "id": book_id,
        "title": annual_report_title(year),
        "team": ANNUAL_REPORT_TEAM,
        "category": ANNUAL_REPORT_CATEGORY,
        "thumbnail": ANNUAL_REPORT_THUMBNAIL,
        "createdAt": now_iso[:10],
        "isAnnualReport": True,
        "year": str(year),
        "entries": [],
    }
    data.setdefault("booksData", []).append(book)
    return book


def _find_entry(book: dict, task_id: str) -> dict | None:
    for entry in book.get("entries", []):
        if isinstance(entry, dict) and str(entry.get("taskId")) == str(task_id):
            return entry
    return None


def upsert_report_entry(
    book: dict,
    *,
    task_id: str,
    kind: str,
    program_name: str,
    now_iso: str,
    team: str | None = None,
    file_id: str | None = None,
    file_name: str | None = None,
    extra: dict | None = None,
) -> dict:
    """사업(업무)별 항목에 한 문서(kind)를 기입/갱신한다.

    같은 업무·같은 문서종류로 다시 호출하면 덮어쓰므로 멱등하다(중복 추가 없음).
    """
    if kind not in DOCUMENT_KINDS:
        raise ValueError(f"unknown annual-report document kind: {kind}")

    entry = _find_entry(book, task_id)
    if entry is None:
        entry = {
            "taskId": str(task_id),
            "programName": program_name,
            "team": team,
            "createdAt": now_iso,
            "plan": None,
            "survey": None,
            "evaluation": None,
        }
        book.setdefault("entries", []).append(entry)

    # 사업명/부서는 최신 값으로 갱신 (비어 있지 않을 때만)
    if program_name:
        entry["programName"] = program_name
    if team:
        entry["team"] = team

    section: dict[str, Any] = {
        "label": KIND_LABELS[kind],
        "completedAt": now_iso,
    }
    if file_id:
        section["fileId"] = str(file_id)
    if file_name:
        section["fileName"] = file_name
    if extra:
        section.update(extra)

    entry[kind] = section
    entry["updatedAt"] = now_iso
    book["updatedAt"] = now_iso
    # 발행부서는 가장 최근 기입 부서를 따른다.
    if team:
        book["team"] = team
    return entry
