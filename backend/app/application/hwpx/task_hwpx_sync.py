"""사업계획서·사업평가 저장 시 HWPX 템플릿 치환 → 파일관리 업로드."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from app.application.hwpx.export_service import HwpxExportService
from app.application.hwpx.document_sections import hwpx_export_document_sections

if TYPE_CHECKING:
    from app.application.services.region_store_service import RegionStoreService

_log = logging.getLogger(__name__)
_export = HwpxExportService()


def sync_plan_hwpx_file(
    store: RegionStoreService,
    region_id: str,
    task_id: str,
    plan_doc: dict[str, Any],
    *,
    card_title: str | None = None,
) -> dict[str, Any]:
    form_data = plan_doc.get("formData") or {}
    sections = hwpx_export_document_sections(plan_doc.get("sections"))
    payload, filename = _export.build_business_plan_hwpx(
        form_data=form_data,
        sections=sections,
    )
    return store.upsert_task_hwpx_file(
        region_id,
        task_id=task_id,
        file_id=plan_doc.get("hwpxFileId"),
        filename=filename,
        content=payload,
        task_name=card_title,
    )


def sync_evaluation_hwpx_file(
    store: RegionStoreService,
    region_id: str,
    task_id: str,
    evaluation: dict[str, Any],
    *,
    plan_form: dict[str, Any] | None = None,
    card_title: str | None = None,
) -> dict[str, Any]:
    evaluation_out = {
        **evaluation,
        "sections": hwpx_export_document_sections(evaluation.get("sections")),
    }
    payload, filename = _export.build_business_evaluation_hwpx(
        evaluation=evaluation_out,
        plan_form=plan_form,
    )
    return store.upsert_task_hwpx_file(
        region_id,
        task_id=task_id,
        file_id=evaluation.get("hwpxFileId"),
        filename=filename,
        content=payload,
        task_name=card_title,
    )


def try_sync_plan_hwpx(
    store: RegionStoreService,
    region_id: str,
    task_id: str,
    plan_doc: dict[str, Any],
    *,
    card_title: str | None = None,
) -> dict[str, Any]:
    try:
        file_meta = sync_plan_hwpx_file(
            store, region_id, task_id, plan_doc, card_title=card_title
        )
        plan_doc["hwpxFileId"] = file_meta.get("id")
        return file_meta
    except Exception:
        _log.exception("사업계획서 HWPX 동기화 실패 task_id=%s", task_id)
        return {}


def try_sync_evaluation_hwpx(
    store: RegionStoreService,
    region_id: str,
    task_id: str,
    evaluation: dict[str, Any],
    *,
    plan_form: dict[str, Any] | None = None,
    card_title: str | None = None,
) -> dict[str, Any]:
    try:
        file_meta = sync_evaluation_hwpx_file(
            store,
            region_id,
            task_id,
            evaluation,
            plan_form=plan_form,
            card_title=card_title,
        )
        evaluation["hwpxFileId"] = file_meta.get("id")
        return file_meta
    except Exception:
        _log.exception("사업평가 HWPX 동기화 실패 task_id=%s", task_id)
        return {}
