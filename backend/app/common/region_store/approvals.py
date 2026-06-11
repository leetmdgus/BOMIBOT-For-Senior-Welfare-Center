"""전자결재 — approvals JSON bounded context."""

from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import UTC, datetime

from fastapi import HTTPException

from app.common.region_store.gateway import RegionStoreGateway
from app.common.domain.region_store.constants import DOMAIN_APPROVALS


class ApprovalApplicationService:
    def __init__(self, gateway: RegionStoreGateway) -> None:
        self._gateway = gateway

    def _load(self, region_id: str) -> dict:
        return self._gateway.load_or_empty(
            region_id,
            DOMAIN_APPROVALS,
            default={"documents": []},
        )

    def list(self, region_id: str, *, status: str | None = None) -> list:
        data = self._load(region_id)
        docs = list(data.get("documents", []))
        if status and status != "all":
            docs = [d for d in docs if d.get("status") == status]
        return deepcopy(docs)

    def create(self, region_id: str, body: dict) -> dict:
        data = self._load(region_id)
        created = {
            "id": f"appr-{uuid.uuid4().hex[:8]}",
            "title": body.get("title", "제목 없음"),
            "type": body.get("type", "일반"),
            "status": body.get("status", "draft"),
            "requester": body.get("requester", ""),
            "department": body.get("department", ""),
            "createdAt": datetime.now(UTC).date().isoformat(),
            "updatedAt": datetime.now(UTC).isoformat(),
            **{k: v for k, v in body.items() if k not in ("id",)},
        }
        data.setdefault("documents", []).insert(0, created)
        self._gateway.save(region_id, DOMAIN_APPROVALS, data)
        return deepcopy(created)

    def update(self, region_id: str, approval_id: str, body: dict) -> dict:
        data = self._load(region_id)
        docs = data.setdefault("documents", [])
        for index, doc in enumerate(docs):
            if doc.get("id") == approval_id:
                docs[index] = {
                    **doc,
                    **body,
                    "id": approval_id,
                    "updatedAt": datetime.now(UTC).date().isoformat(),
                }
                self._gateway.save(region_id, DOMAIN_APPROVALS, data)
                return deepcopy(docs[index])
        raise HTTPException(status_code=404, detail="Approval not found")

    def delete(self, region_id: str, approval_id: str) -> dict:
        data = self._load(region_id)
        docs = data.get("documents", [])
        next_docs = [d for d in docs if d.get("id") != approval_id]
        if len(next_docs) == len(docs):
            raise HTTPException(status_code=404, detail="Approval not found")
        data["documents"] = next_docs
        self._gateway.save(region_id, DOMAIN_APPROVALS, data)
        return {"success": True, "deletedId": approval_id}
