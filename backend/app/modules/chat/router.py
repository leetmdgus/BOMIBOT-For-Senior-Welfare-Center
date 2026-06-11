from fastapi import APIRouter, Depends, Query

from app.modules.chat.service import ChatService
from app.common.region_store.service import RegionStoreService
from app.common.dependencies import (
    get_chat_service,
    get_region_store_service,
    require_region_id,
)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/config")
def chat_config(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.get_chat_config(region_id)


@router.patch("/config")
def patch_chat_config(
    body: dict,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.save_chat_config(region_id, body)


@router.post("/assistant")
async def chat_assistant(
    body: dict,
    region_id: str = Depends(require_region_id),
    service: ChatService = Depends(get_chat_service),
):
    return await service.ask_assistant(region_id, body.get("message", ""))


@router.post("/cs-ticket")
def chat_cs_ticket(
    body: dict,
    _region_id: str = Depends(require_region_id),
    service: ChatService = Depends(get_chat_service),
):
    return service.submit_cs_ticket(body)


@router.get("/ontology")
def chat_ontology(
    region_id: str = Depends(require_region_id),
    service: ChatService = Depends(get_chat_service),
    q: str | None = Query(default=None),
):
    return service.get_ontology_graph(region_id, q)
