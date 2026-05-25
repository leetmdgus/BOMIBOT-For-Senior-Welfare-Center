"""Build RAG corpus from region-scoped assistant snapshot."""

from __future__ import annotations

import re
from typing import Any


def _chunk(chunk_id: str, source: str, title: str, text: str) -> dict[str, Any]:
    return {"id": chunk_id, "source": source, "title": title, "text": text}


def _tokenize(question: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", question.lower().strip())
    return [t for t in re.split(r"[^\w가-힣]+", normalized) if len(t) >= 2]


def build_rag_corpus(
    snapshot: dict[str, Any],
    *,
    input_rows: list[dict[str, Any]] | None = None,
    books: list[dict[str, Any]] | None = None,
    kanban_projects: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    dashboard = snapshot["dashboard"]
    performance = snapshot["performance"]
    kanban = snapshot["kanban"]
    organization = snapshot["organization"]
    ebooks = snapshot["ebooks"]
    surveys = snapshot["surveys"]

    chunks.append(
        _chunk(
            "dashboard:summary",
            "dashboard",
            "대시보드 요약",
            "\n".join(
                [
                    "대시보드 지표:",
                    *[
                        f"{s['label']} {s['value']}{s['unit']} — {s['description']}"
                        for s in dashboard.get("stats", [])
                    ],
                    "진행률:",
                    *[f"{p['label']} {p['value']}%" for p in dashboard.get("progress", [])],
                ]
            ),
        )
    )

    totals = performance.get("totals", {})
    chunks.append(
        _chunk(
            "performance:totals",
            "performance",
            "계획/실적 전체 합계",
            "\n".join(
                [
                    f"입력 행 {performance.get('rowCount', 0)}건",
                    f"계획 예산 합계 {totals.get('planBudget', 0):,}원",
                    f"실적 지출 합계 {totals.get('actualExpense', 0):,}원",
                ]
            ),
        )
    )

    for month, metrics in performance.get("byMonth", {}).items():
        if metrics.get("planBudget", 0) or metrics.get("actualExpense", 0):
            chunks.append(
                _chunk(
                    f"performance:month:{month}",
                    "performance",
                    f"월별 실적 · {month}",
                    (
                        f"{month} 계획 예산 {metrics.get('planBudget', 0):,}원, "
                        f"실적 지출 {metrics.get('actualExpense', 0):,}원."
                    ),
                )
            )

    for name in performance.get("subProjects", []):
        metrics = performance.get("bySubProject", {}).get(name)
        if metrics:
            chunks.append(
                _chunk(
                    f"performance:sub:{name}",
                    "performance",
                    f"세목 · {name}",
                    f"{name}: 계획 {metrics.get('planBudget', 0):,}원 / 실적 {metrics.get('actualExpense', 0):,}원",
                )
            )

    for row in input_rows or []:
        sub = row.get("subProject") or ""
        if not sub or sub == "선택":
            continue
        chunks.append(
            _chunk(
                f"performance:row:{row.get('id', sub)}",
                "performance",
                f"{sub} · {row.get('detailCategory', '')} · {row.get('month', '')}",
                (
                    f"세목 {sub}, {row.get('month', '')} — "
                    f"계획 예산 {row.get('planBudget', 0):,}원, "
                    f"실적 지출 {row.get('actualExpense', 0):,}원"
                ),
            )
        )

    chunks.append(
        _chunk(
            "kanban:summary",
            "kanban",
            "칸반 보드 요약",
            f"프로젝트 {kanban.get('projectCount', 0)}개, 업무 {kanban.get('taskCount', 0)}건",
        )
    )

    for project in kanban_projects or []:
        for category in project.get("categories", []):
            for task in category.get("tasks", []):
                chunks.append(
                    _chunk(
                        f"kanban:task:{task.get('id', task.get('title'))}",
                        "kanban",
                        f"칸반 · {project.get('title', '')} · {task.get('title', '')}",
                        (
                            f"프로젝트 {project.get('title')}, 컬럼 {category.get('title')}, "
                            f"업무 {task.get('title')}"
                        ),
                    )
                )

    chunks.append(
        _chunk(
            "organization:summary",
            "organization",
            "조직 현황",
            f"부서 {organization.get('departmentCount', 0)}개, 직원 {organization.get('employeeCount', 0)}명",
        )
    )

    chunks.append(
        _chunk(
            "ebooks:summary",
            "ebooks",
            "전자책 자료",
            f"전자책 {ebooks.get('bookCount', 0)}권",
        )
    )

    for book in books or []:
        chunks.append(
            _chunk(
                f"ebooks:book:{book.get('id')}",
                "ebooks",
                f"전자책 · {book.get('title', '')}",
                f"{book.get('title')} ({book.get('category', '')}, {book.get('team', '')})",
            )
        )

    chunks.append(
        _chunk(
            "survey:summary",
            "survey",
            "설문 목록",
            f"설문 {surveys.get('totalCount', 0)}개",
        )
    )

    return chunks


def tokenize_for_search(question: str) -> list[str]:
    return _tokenize(question)
