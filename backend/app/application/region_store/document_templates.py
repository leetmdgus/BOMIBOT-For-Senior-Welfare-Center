"""사용자 업로드 문서 양식(템플릿) — document_templates JSON bounded context.

설계:
    - 도메인 JSON 에는 경량 메타데이터만 저장(템플릿 목록 = "이전 양식 불러오기").
    - 원본 파일 bytes 는 FileStorageService(region별 디스크)에 보관.
    - frontendJson(편집 구조)은 저장하지 않고 GET 시 원본을 재파싱 → 단일 진실 원천.
    - 채운 값 반영(export)은 기존 export_hwpx_preserving 를 그대로 사용(원본 절대 보존).

Phase 1 범위: .hwpx 업로드 · 목록 · 조회(재파싱) · 삭제 · 채운 값 내보내기.
슬롯 자동 탐지/AI 매핑은 Phase 2.
"""

from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from app.application.hwpx.automation.section0_writeback import export_hwpx_preserving
from app.application.hwpx.automation.service import HwpxAutomationService
from app.application.hwpx.hwpx_package import is_hwpx_filename
from app.application.region_store.gateway import RegionStoreGateway
from app.application.services.file_storage_service import FileStorageService
from app.domain.region_store.constants import DOMAIN_DOCUMENT_TEMPLATES


def _iter_tables(frontend_json: dict[str, Any]):
    for p in (frontend_json.get("document") or {}).get("paragraphs") or []:
        for run in p.get("runs") or []:
            if run.get("type") == "table":
                yield run


def _compute_stats(frontend_json: dict[str, Any]) -> dict[str, int]:
    """목록 표시용 경량 통계 — 표/셀/빈칸 수."""
    table_count = 0
    cell_count = 0
    empty_count = 0
    for tbl in _iter_tables(frontend_json):
        table_count += 1
        for row in tbl.get("rows") or []:
            for cell in row.get("cells") or []:
                cell_count += 1
                if not (cell.get("text") or "").strip():
                    empty_count += 1
    return {
        "tableCount": table_count,
        "cellCount": cell_count,
        "emptyCellCount": empty_count,
    }


class DocumentTemplateService:
    def __init__(
        self,
        gateway: RegionStoreGateway,
        file_storage: FileStorageService,
    ) -> None:
        self._gateway = gateway
        self._fs = file_storage
        self._hwpx = HwpxAutomationService()

    # --- 저장소 ---

    def _load(self, region_id: str) -> dict:
        return self._gateway.load_or_empty(
            region_id,
            DOMAIN_DOCUMENT_TEMPLATES,
            default={"templates": []},
        )

    def _save(self, region_id: str, data: dict) -> None:
        self._gateway.save(region_id, DOMAIN_DOCUMENT_TEMPLATES, data)

    def _find(self, data: dict, template_id: str) -> dict | None:
        for tpl in data.get("templates", []):
            if tpl.get("id") == template_id:
                return tpl
        return None

    def _read_bytes(self, region_id: str, meta: dict) -> bytes:
        storage_key = meta.get("storageKey")
        if not storage_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="템플릿 원본 파일을 찾을 수 없습니다.",
            )
        return self._fs.resolve_path(region_id, str(storage_key)).read_bytes()

    # --- 공개 API ---

    def list_templates(self, region_id: str) -> list[dict]:
        """이전 양식 불러오기 — 메타데이터 목록(최신순)."""
        data = self._load(region_id)
        templates = list(data.get("templates", []))
        templates.sort(key=lambda t: t.get("createdAt", ""), reverse=True)
        return deepcopy(templates)

    def create_template(
        self,
        region_id: str,
        *,
        filename: str,
        content: bytes,
        created_by: str = "시스템",
        name: str | None = None,
        kind: str | None = None,
    ) -> dict:
        """양식 업로드 — .hwpx 파싱 검증 → 원본 보관 → 메타 등록."""
        if not content:
            raise HTTPException(status_code=400, detail="업로드된 파일이 비어 있습니다.")
        if not is_hwpx_filename(filename):
            # Phase 3 에서 rhwp 로 .hwp 정규화 추가 예정
            raise HTTPException(
                status_code=400,
                detail="현재는 HWPX 파일(.hwpx)만 업로드할 수 있습니다.",
            )

        # 파싱 가능 여부 검증 + 통계 산출
        try:
            parsed = self._hwpx.parse_hwpx_bytes(content, source_filename=filename)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=400,
                detail=f"HWPX 파싱에 실패했습니다: {exc}",
            ) from exc

        frontend_json = parsed["frontendJson"]
        stats = _compute_stats(frontend_json)

        template_id = f"tpl-{uuid.uuid4().hex[:12]}"
        storage_key, _mime = self._fs.write(region_id, template_id, filename, content)

        meta = {
            "id": template_id,
            "name": (name or parsed.get("documentTitle") or filename).strip(),
            "sourceFilename": filename,
            "format": "hwpx",
            "kind": (kind or "").strip() or None,  # plan | evaluation | None(범용)
            "storageKey": storage_key,
            "stats": stats,
            "createdAt": datetime.now(UTC).isoformat(),
            "createdBy": created_by,
        }

        data = self._load(region_id)
        data.setdefault("templates", []).insert(0, meta)
        self._save(region_id, data)
        return deepcopy(meta)

    def get_template(self, region_id: str, template_id: str) -> dict:
        """양식 메타 + 편집용 frontendJson(원본 재파싱)."""
        data = self._load(region_id)
        meta = self._find(data, template_id)
        if meta is None:
            raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")

        content = self._read_bytes(region_id, meta)
        parsed = self._hwpx.parse_hwpx_bytes(
            content, source_filename=meta.get("sourceFilename") or "document.hwpx"
        )
        return {
            **deepcopy(meta),
            "frontendJson": parsed["frontendJson"],
        }

    def delete_template(self, region_id: str, template_id: str) -> dict:
        data = self._load(region_id)
        meta = self._find(data, template_id)
        if meta is None:
            raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
        self._fs.delete(region_id, meta.get("storageKey"))
        data["templates"] = [
            t for t in data.get("templates", []) if t.get("id") != template_id
        ]
        self._save(region_id, data)
        return {"id": template_id, "deleted": True}

    def read_template_bytes(self, region_id: str, template_id: str) -> bytes:
        """양식 원본 HWPX bytes — 계획/평가 렌더의 베이스 양식으로 사용."""
        data = self._load(region_id)
        meta = self._find(data, template_id)
        if meta is None:
            raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
        return self._read_bytes(region_id, meta)

    def prefill(
        self,
        region_id: str,
        template_id: str,
        *,
        kind: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        """업로드 양식에 계획/평가 값을 라벨 매칭으로 채운 frontendJson 반환.

        우측 WYSIWYG 편집기 초기값 — 사용자가 이 위에서 직접 수정한다.
        """
        from app.application.hwpx.render.custom_template_fill import (
            prefill_evaluation_frontend_json,
            prefill_plan_frontend_json,
        )

        store = self._load(region_id)
        meta = self._find(store, template_id)
        if meta is None:
            raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
        original = self._read_bytes(region_id, meta)
        source_filename = meta.get("sourceFilename") or "template.hwpx"

        if kind == "evaluation":
            return prefill_evaluation_frontend_json(
                original, data, source_filename=source_filename
            )
        return prefill_plan_frontend_json(
            original, data, source_filename=source_filename
        )

    def export_filled(
        self,
        region_id: str,
        template_id: str,
        frontend_json: dict[str, Any],
        *,
        sections: list[dict[str, Any]] | None = None,
    ) -> tuple[bytes, str]:
        """채운 frontendJson 을 원본 양식에 절대 보존으로 반영 → (bytes, filename).

        sections(추가본문·대목차·본문)가 있으면 문서 끝에 그래프트해 함께 내보낸다.
        """
        store = self._load(region_id)
        meta = self._find(store, template_id)
        if meta is None:
            raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
        if not frontend_json:
            raise HTTPException(status_code=400, detail="frontendJson 이 비어 있습니다.")

        original = self._read_bytes(region_id, meta)
        payload = export_hwpx_preserving(original, frontend_json)

        if sections:
            # 추가본문/본문 유지 — 기본 양식과 동일한 그래프트 로직 재사용
            from app.application.hwpx.render.service import (
                _graft_and_fill_reference_sections,
            )

            payload = _graft_and_fill_reference_sections(payload, sections)

        out_name = meta.get("sourceFilename") or f"{meta.get('name', 'template')}.hwpx"
        if not out_name.lower().endswith(".hwpx"):
            out_name = f"{out_name}.hwpx"
        return payload, out_name
