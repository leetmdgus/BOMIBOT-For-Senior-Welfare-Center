from __future__ import annotations

import logging

from fastapi import HTTPException, status

from app.application.chat.assistant_engine import answer_assistant_question
from app.application.chat.assistant_llm import answer_with_rag_llm, is_assistant_llm_configured
from app.application.chat.assistant_snapshot import build_assistant_snapshot
from app.application.chat.cs_ticket import process_cs_ticket
from app.application.chat.ontology_query import query_knowledge_graph
from app.application.chat.rag.resolve import resolve_rag_for_question
from app.application.services.dashboard_service import DashboardService
from app.application.services.kanban_board_service import KanbanBoardService
from app.application.services.organization_service import OrganizationService
from app.application.services.region_store_service import (
    DOMAIN_EBOOKS,
    DOMAIN_ONTOLOGY,
    RegionStoreService,
)
from app.core.config import Settings
from app.infrastructure.persistence.repositories.sqlalchemy_json_store_repository import (
    SqlAlchemyJsonStoreRepository,
)

logger = logging.getLogger(__name__)


def _to_citations(rag: dict) -> list[dict]:
    return [
        {
            "id": chunk.get("id", ""),
            "source": chunk.get("source", "rag"),
            "title": chunk.get("title", ""),
            "snippet": (chunk.get("text") or "")[:220],
            "score": chunk.get("score"),
        }
        for chunk in rag.get("chunks", [])
    ]


class ChatService:
    def __init__(
        self,
        settings: Settings,
        json_repo: SqlAlchemyJsonStoreRepository,
        region_store: RegionStoreService,
        dashboard_service: DashboardService,
        organization_service: OrganizationService,
        kanban_service: KanbanBoardService,
    ) -> None:
        self._settings = settings
        self._json_repo = json_repo
        self._region_store = region_store
        self._dashboard_service = dashboard_service
        self._organization_service = organization_service
        self._kanban_service = kanban_service

    async def ask_assistant(self, region_id: str, message: str) -> dict:
        text = (message or "").strip()
        if not text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="질문 내용이 필요합니다.",
            )

        snapshot = build_assistant_snapshot(
            region_id,
            region_store=self._region_store,
            dashboard_service=self._dashboard_service,
            organization_service=self._organization_service,
            kanban_service=self._kanban_service,
        )
        input_rows = self._region_store.aggregate_input_management_rows(region_id)
        ebooks = self._region_store.get_domain_payload(region_id, DOMAIN_EBOOKS)
        books = ebooks.get("booksData", [])
        projects = self._kanban_service.list_projects(region_id, "2026")

        rag = await resolve_rag_for_question(
            self._settings,
            text,
            snapshot,
            input_rows=input_rows,
            books=books,
            kanban_projects=projects,
        )
        citations = _to_citations(rag)

        if is_assistant_llm_configured(self._settings):
            try:
                llm = await answer_with_rag_llm(self._settings, text, snapshot, rag)
                return {
                    "answer": llm["content"],
                    "sources": llm["sources"],
                    "dataAsOf": snapshot["generatedAt"],
                    "ragCitations": citations,
                }
            except Exception as exc:
                logger.warning("[assistant-llm] fallback to rules: %s", exc)

        rule = answer_assistant_question(text, snapshot)
        sources = list(dict.fromkeys([*rule["sources"], "rag"]))
        return {
            "answer": rule["content"],
            "sources": sources,
            "dataAsOf": snapshot["generatedAt"],
            "ragCitations": citations,
        }

    def submit_cs_ticket(self, payload: dict) -> dict:
        try:
            return process_cs_ticket(self._settings, payload)
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(exc),
            ) from exc

    def get_ontology_graph(self, region_id: str, question: str | None = None) -> dict:
        graph = self._json_repo.get_payload(region_id, DOMAIN_ONTOLOGY)
        if not graph:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ontology graph not seeded",
            )

        payload: dict = {
            "graph": graph,
            "stats": {
                "nodeCount": len(graph.get("nodes", [])),
                "edgeCount": len(graph.get("edges", [])),
                "domainCount": 6,
            },
        }
        q = (question or "").strip()
        if q:
            payload["query"] = query_knowledge_graph(q, graph)
        return payload
