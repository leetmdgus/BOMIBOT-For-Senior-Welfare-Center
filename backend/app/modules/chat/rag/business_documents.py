"""사업계획·사업평가·업무 첨부 파일 → RAG 코퍼스."""

from __future__ import annotations

import json
import re
from typing import Any

from app.modules.chat.rag.business_documents_filters import file_extension
from app.common.hwpx.encoding import strip_html
from app.modules.kanban.service import KanbanBoardService
from app.common.region_store.service import (
    DOMAIN_TASK_DETAIL,
    RegionStoreService,
)
from app.common.domain.scoped_ids import strip_scope

_DOC_SOURCE = "documents"


def _chunk(
    chunk_id: str,
    title: str,
    text: str,
    *,
    meta: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": chunk_id,
        "source": _DOC_SOURCE,
        "title": title,
        "text": text,
        "meta": meta,
    }


def _sections_plain(sections: list[Any] | None) -> str:
    parts: list[str] = []
    for section in sections or []:
        if not isinstance(section, dict):
            continue
        section_type = section.get("type")
        title = str(section.get("title") or "").strip()
        if section_type == "heading" and title:
            parts.append(title)
        elif section_type == "body":
            if title:
                parts.append(title)
            content = strip_html(str(section.get("content") or ""))
            if content:
                parts.append(content)
        elif section_type == "file":
            raw = section.get("content")
            if isinstance(raw, str) and raw.strip():
                try:
                    parsed = json.loads(raw)
                    name = parsed.get("name") if isinstance(parsed, dict) else None
                    if name:
                        parts.append(f"첨부: {name}")
                except json.JSONDecodeError:
                    pass
        elif section_type == "table" and title:
            parts.append(title)
    return "\n".join(parts)


def _task_title(
    kanban: KanbanBoardService,
    region_id: str,
    task_id: str,
) -> str:
    title = kanban.resolve_task_title(region_id, task_id)
    return title or task_id


def build_business_documents_corpus(
    region_id: str,
    *,
    region_store: RegionStoreService,
    kanban: KanbanBoardService,
    allowed_task_ids: set[str] | None = None,
    task_id: str | None = None,
) -> list[dict[str, Any]]:
    """region 내 사업문서(계획·평가·첨부) 텍스트 조각."""
    chunks: list[dict[str, Any]] = []
    task_detail = region_store.get_domain_payload(region_id, DOMAIN_TASK_DETAIL)
    runtime = task_detail.get("runtime") or {}
    plans: dict[str, Any] = runtime.get("businessPlanByTaskId") or {}
    evaluations: dict[str, Any] = runtime.get("evaluationByTaskId") or {}

    files_store = region_store.get_file_manager_state(
        region_id,
        allowed_task_ids=allowed_task_ids,
    )
    tree_files = files_store.get("files") or []

    focus_tid = strip_scope(task_id) if task_id else None
    task_meta_index = kanban.build_task_meta_index(region_id)

    def task_meta(tid: str) -> dict[str, str]:
        return task_meta_index.get(strip_scope(tid), {})

    def allowed(tid: str) -> bool:
        normalized = strip_scope(tid)
        if focus_tid and normalized != focus_tid:
            return False
        if allowed_task_ids is not None and normalized not in allowed_task_ids:
            return False
        return True

    for tid, plan in plans.items():
        if not isinstance(plan, dict) or not allowed(str(tid)):
            continue
        form = plan.get("formData") or {}
        project = str(form.get("projectName") or "").strip()
        card = _task_title(kanban, region_id, str(tid))
        title = project or card
        meta = task_meta(str(tid))
        body_parts = [
            f"사업계획서 · {title}",
            f"업무: {card}",
        ]
        if meta.get("year"):
            body_parts.append(f"연도: {meta['year']}")
        if meta.get("majorCategory"):
            body_parts.append(f"사업: {meta['majorCategory']}")
        body_parts.extend([
            f"목적: {strip_html(str(form.get('purpose') or ''))}",
            "목표: "
            + ", ".join(g for g in (form.get("goals") or []) if g),
            f"기간: {form.get('period', '')}",
            f"대상: {form.get('target', '')}",
            f"예산: {form.get('budget', '')}",
            f"담당: {form.get('manager', '')}",
            _sections_plain(plan.get("sections")),
        ])
        text = "\n".join(p for p in body_parts if p and p.strip())
        if not text.strip():
            continue
        chunks.append(
            _chunk(
                f"plan:{strip_scope(tid)}",
                f"사업계획 · {title}",
                text,
                meta={
                    "taskId": strip_scope(tid),
                    "docKind": "plan",
                    "href": f"/kanban/task/{strip_scope(tid)}/business-plan",
                    "projectName": project,
                    "year": meta.get("year", ""),
                    "majorCategory": meta.get("majorCategory", ""),
                    "categoryTitle": meta.get("categoryTitle", ""),
                    "extension": "",
                },
            )
        )

    for tid, evaluation in evaluations.items():
        if not isinstance(evaluation, dict) or not allowed(str(tid)):
            continue
        program = str(evaluation.get("programName") or "").strip()
        card = _task_title(kanban, region_id, str(tid))
        title = program or card
        meta = task_meta(str(tid))
        body_parts = [
            f"사업평가 · {title}",
            f"업무: {card}",
        ]
        if meta.get("year"):
            body_parts.append(f"연도: {meta['year']}")
        if meta.get("majorCategory"):
            body_parts.append(f"사업: {meta['majorCategory']}")
        body_parts.extend([
            f"목적: {strip_html(str(evaluation.get('purpose') or ''))}",
            "목표: "
            + ", ".join(g for g in (evaluation.get("goals") or []) if g),
            f"성과지표: {strip_html(str(evaluation.get('performanceIndicator') or ''))}",
            f"평가도구: {strip_html(str(evaluation.get('evaluationTool') or ''))}",
            _sections_plain(evaluation.get("sections")),
        ])
        text = "\n".join(p for p in body_parts if p and p.strip())
        if not text.strip():
            continue
        chunks.append(
            _chunk(
                f"eval:{strip_scope(tid)}",
                f"사업평가 · {title}",
                text,
                meta={
                    "taskId": strip_scope(tid),
                    "docKind": "evaluation",
                    "href": f"/kanban/task/{strip_scope(tid)}/business-evaluation",
                    "programName": program,
                    "year": meta.get("year", ""),
                    "majorCategory": meta.get("majorCategory", ""),
                    "categoryTitle": meta.get("categoryTitle", ""),
                    "extension": "",
                },
            )
        )

    for item in tree_files:
        if item.get("type") == "folder":
            continue
        raw_tid = item.get("taskId")
        if not raw_tid:
            continue
        tid = strip_scope(str(raw_tid))
        if not allowed(tid):
            continue
        name = str(item.get("name") or "파일")
        file_type = str(item.get("type") or "etc")
        mime = str(item.get("mimeType") or "")
        card = _task_title(kanban, region_id, tid)
        meta = task_meta(tid)
        ext = file_extension(name)
        text = (
            f"첨부파일 · {name}\n업무: {card}\n형식: {file_type} {mime}"
            + (f"\n연도: {meta['year']}" if meta.get("year") else "")
            + (f"\n사업: {meta['majorCategory']}" if meta.get("majorCategory") else "")
            + (f"\n확장자: {ext}" if ext else "")
        ).strip()
        chunks.append(
            _chunk(
                f"file:{item.get('id')}",
                f"첨부 · {name} ({card})",
                text,
                meta={
                    "taskId": tid,
                    "docKind": "file",
                    "fileId": str(item.get("id") or ""),
                    "fileName": name,
                    "href": f"/kanban/task/{tid}/business-evaluation",
                    "year": meta.get("year", ""),
                    "majorCategory": meta.get("majorCategory", ""),
                    "categoryTitle": meta.get("categoryTitle", ""),
                    "extension": ext,
                },
            )
        )

    return chunks


def citation_from_chunk(chunk: dict[str, Any]) -> dict[str, Any]:
    meta = chunk.get("meta") if isinstance(chunk.get("meta"), dict) else {}
    text = str(chunk.get("text") or "")
    snippet = re.sub(r"\s+", " ", text).strip()[:220]
    return {
        "id": chunk.get("id", ""),
        "source": chunk.get("source", _DOC_SOURCE),
        "title": chunk.get("title", ""),
        "snippet": snippet,
        "score": chunk.get("score"),
        "taskId": meta.get("taskId"),
        "docKind": meta.get("docKind"),
        "fileId": meta.get("fileId"),
        "href": meta.get("href"),
        "year": meta.get("year"),
        "majorCategory": meta.get("majorCategory"),
        "categoryTitle": meta.get("categoryTitle"),
        "extension": meta.get("extension"),
    }
