from __future__ import annotations

from typing import Any

import httpx

from app.application.chat.rag.corpus import build_rag_corpus
from app.application.chat.rag.retrieve import format_rag_context, retrieve_rag_chunks
from app.core.config import Settings


async def _fetch_external_rag(settings: Settings, question: str) -> dict[str, Any] | None:
    url = (settings.rag_api_url or "").strip()
    if not url:
        return None

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.rag_api_key:
        headers["Authorization"] = f"Bearer {settings.rag_api_key}"

    payload = {"question": question, "top_k": settings.rag_top_k}
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    chunks = data.get("chunks") or data.get("results") or []
    if not chunks:
        return None

    normalized = []
    for index, item in enumerate(chunks):
        normalized.append(
            {
                "id": item.get("id") or f"ext-{index}",
                "source": item.get("source") or "rag",
                "title": item.get("title") or "문서",
                "text": item.get("text") or item.get("content") or item.get("snippet") or "",
                "score": item.get("score"),
            }
        )

    return {
        "chunks": normalized,
        "contextText": format_rag_context(normalized),
    }


async def resolve_rag_for_question(
    settings: Settings,
    question: str,
    snapshot: dict[str, Any],
    *,
    input_rows: list[dict[str, Any]] | None = None,
    books: list[dict[str, Any]] | None = None,
    kanban_projects: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    try:
        external = await _fetch_external_rag(settings, question)
        if external and external.get("chunks"):
            return external
    except Exception:
        pass

    corpus = build_rag_corpus(
        snapshot,
        input_rows=input_rows,
        books=books,
        kanban_projects=kanban_projects,
    )
    chunks = retrieve_rag_chunks(question, corpus, settings.rag_top_k)
    return {"chunks": chunks, "contextText": format_rag_context(chunks)}
