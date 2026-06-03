"""사업문서 키워드·RAG 검색."""

from __future__ import annotations

from typing import Any

from app.application.chat.rag.business_documents import (
    build_business_documents_corpus,
    citation_from_chunk,
)
from app.application.chat.rag.business_documents_filters import (
    collect_document_facets,
    filter_business_documents_corpus,
)
from app.application.chat.rag.retrieve import retrieve_rag_chunks
from app.application.kanban_access import (
    KanbanAccessContext,
    gather_accessible_task_ids,
)
from app.application.services.kanban_board_service import KanbanBoardService
from app.application.services.region_store_service import RegionStoreService


class BusinessDocumentsSearchService:
    def __init__(
        self,
        region_store: RegionStoreService,
        kanban: KanbanBoardService,
    ) -> None:
        self._region_store = region_store
        self._kanban = kanban

    def search(
        self,
        region_id: str,
        query: str,
        *,
        access: KanbanAccessContext,
        task_id: str | None = None,
        limit: int = 12,
        year: str | None = None,
        category: str | None = None,
        extension: str | None = None,
    ) -> dict[str, Any]:
        text = (query or "").strip()
        allowed = gather_accessible_task_ids(
            self._kanban,
            region_id,
            access,
        )
        corpus = build_business_documents_corpus(
            region_id,
            region_store=self._region_store,
            kanban=self._kanban,
            allowed_task_ids=allowed,
            task_id=task_id,
        )
        facets = collect_document_facets(corpus)
        filtered = filter_business_documents_corpus(
            corpus,
            year=year,
            category=category,
            extension=extension,
        )

        if not text:
            preview = [citation_from_chunk(c) for c in filtered[:limit]]
            return {
                "query": "",
                "totalCorpus": len(filtered),
                "results": preview,
                "facets": facets,
                "filters": {
                    "year": year or "",
                    "category": category or "",
                    "extension": extension or "",
                },
            }

        chunks = retrieve_rag_chunks(text, filtered, top_k=max(1, min(limit, 24)))
        results = [citation_from_chunk(chunk) for chunk in chunks]
        return {
            "query": text,
            "totalCorpus": len(filtered),
            "results": results,
            "facets": facets,
            "filters": {
                "year": year or "",
                "category": category or "",
                "extension": extension or "",
            },
        }
