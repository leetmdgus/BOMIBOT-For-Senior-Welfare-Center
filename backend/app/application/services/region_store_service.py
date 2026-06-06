"""Region-scoped JSON payloads (mock parity) backed by region_json_stores."""

from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.core.datetime_kst import format_kst_datetime, kst_year, now_kst

from app.application.kanban_access import (
    assert_file_tree_access,
    file_entry_allowed,
    filter_file_tree,
)
from app.application.documents_reports import (
    build_budget_report_rows,
    build_business_plan_report,
    build_performance_report_rows,
)
from app.application.services.file_storage_service import FileStorageService
from app.application.services.survey_service import SurveyService
from app.application.task_detail_bootstrap import (
    bootstrap_business_plan,
    bootstrap_evaluation,
    bootstrap_task_surveys,
    task_performance_seed_index,
    task_performance_seed_month,
    business_name_for_task,
    normalize_task_id,
)
from app.application.region_store.approvals import ApprovalApplicationService
from app.application.region_store.chat_config import ChatConfigApplicationService
from app.application.region_store.document_templates import DocumentTemplateService
from app.application.region_store.gateway import RegionStoreGateway
from app.domain.region_store.constants import (
    DOMAIN_EBOOKS,
    DOMAIN_FILES,
    DOMAIN_ONTOLOGY,
    DOMAIN_PERFORMANCE,
    DOMAIN_REPORTS,
    DOMAIN_SURVEY,
    DOMAIN_TASK_DETAIL,
    DOMAIN_VERSION_HISTORY,
)
from app.domain.region_store.repository import RegionJsonStoreRepository
from app.domain.shared.scoped_ids import strip_scope

from app.domain.region_store.constants import (  # noqa: E402 — re-export
    DOMAIN_APPROVALS,
    DOMAIN_CHAT,
)

# 하위 호환 — 기존 `from region_store_service import DOMAIN_*` 유지
__all__ = [
    "DOMAIN_APPROVALS",
    "DOMAIN_CHAT",
    "DOMAIN_EBOOKS",
    "DOMAIN_FILES",
    "DOMAIN_ONTOLOGY",
    "DOMAIN_PERFORMANCE",
    "DOMAIN_REPORTS",
    "DOMAIN_SURVEY",
    "DOMAIN_TASK_DETAIL",
    "DOMAIN_VERSION_HISTORY",
    "RegionStoreService",
]


# 데모용으로 미리 정의된 업무(카드)만 초기 실적 행을 시드한다.
# 신규로 만든 카드(임의 taskId)는 기본 실적 행 없이 빈 표로 시작한다.
# (프론트엔드 mock bootstrapInputRowsForTask 와 동일한 정책)
_DEMO_SEED_TASK_IDS = frozenset(
    {"task1", "task2", "task3", "task4", "task5", "task6"}
)


class RegionStoreService:
    """JSON region store (TaskDetailRepository·PerformanceRepository 계약 충족)."""

    def __init__(
        self,
        repo: RegionJsonStoreRepository,
        file_storage: FileStorageService | None = None,
        *,
        survey_service: SurveyService | None = None,
    ) -> None:
        self._gateway = RegionStoreGateway(repo)
        self._repo = repo
        self._file_storage = file_storage or FileStorageService()
        if survey_service is None:
            raise ValueError(
                "survey_service is required — wire via infrastructure.di.container"
            )
        self._surveys = survey_service
        self._approvals = ApprovalApplicationService(self._gateway)
        self._chat_config = ChatConfigApplicationService(self._gateway)
        self._document_templates = DocumentTemplateService(
            self._gateway, self._file_storage
        )

    def get_domain_payload(self, region_id: str, domain: str) -> dict:
        return self._load(region_id, domain)

    def _load(self, region_id: str, domain: str) -> dict:
        return self._gateway.load(region_id, domain)

    def _save(self, region_id: str, domain: str, payload: dict) -> dict:
        return self._gateway.save(region_id, domain, payload)

    # --- ebooks ---

    def list_ebooks(
        self,
        region_id: str,
        *,
        category: str | None = None,
        search: str | None = None,
    ) -> dict:
        data = self._load(region_id, DOMAIN_EBOOKS)
        books = list(data.get("booksData", []))
        if category and category not in ("전체", "??"):
            books = [b for b in books if b.get("category") == category]
        if search:
            keyword = search.lower()
            books = [
                b
                for b in books
                if keyword in b.get("title", "").lower()
                or keyword in b.get("team", "").lower()
            ]
        return {
            "ebooks": books,
            "categories": data.get("categories", []),
            "categoryStyles": data.get("categoryStyles", {}),
            "total": len(books),
        }

    def get_category_styles(self, region_id: str) -> dict:
        return deepcopy(self._load(region_id, DOMAIN_EBOOKS).get("categoryStyles", {}))

    def get_suggested_questions(self, region_id: str) -> list:
        return deepcopy(self._load(region_id, DOMAIN_EBOOKS).get("suggestedQuestions", []))

    def create_ebook(self, region_id: str, body: dict) -> dict:
        data = self._load(region_id, DOMAIN_EBOOKS)
        created = {
            "id": f"ebook{int(datetime.now(UTC).timestamp() * 1000)}",
            **body,
            "thumbnail": body.get("thumbnail") or "/placeholder.svg",
            "createdAt": datetime.now(UTC).date().isoformat(),
        }
        data.setdefault("booksData", []).append(created)
        self._save(region_id, DOMAIN_EBOOKS, data)
        return deepcopy(created)

    def update_ebook(self, region_id: str, ebook_id: str, body: dict) -> dict:
        data = self._load(region_id, DOMAIN_EBOOKS)
        books = data.setdefault("booksData", [])
        for index, book in enumerate(books):
            if book.get("id") == ebook_id:
                books[index] = {**book, **body, "id": ebook_id}
                self._save(region_id, DOMAIN_EBOOKS, data)
                return deepcopy(books[index])
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ebook not found")

    def delete_ebook(self, region_id: str, ebook_id: str) -> dict:
        data = self._load(region_id, DOMAIN_EBOOKS)
        books = data.get("booksData", [])
        next_books = [b for b in books if b.get("id") != ebook_id]
        if len(next_books) == len(books):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ebook not found")
        data["booksData"] = next_books
        self._save(region_id, DOMAIN_EBOOKS, data)
        return {"success": True, "deletedId": ebook_id}

    # --- files (file manager tree: parentId, permission, taskOptions) ---

    _FILE_TYPES = frozenset(
        {"folder", "document", "image", "spreadsheet", "video", "pdf", "archive", "etc"}
    )
    _PERMISSIONS = frozenset({"private", "team", "public"})
    _FILTER_ALL_LABELS = frozenset({"전체", "all", "All"})

    @staticmethod
    def _files_manager(data: dict) -> dict:
        return data.setdefault("filesManager", {})

    def _get_tree_files(self, data: dict) -> list[dict]:
        manager = self._files_manager(data)
        tree = manager.get("initialFiles")
        if isinstance(tree, list) and tree:
            return list(tree)
        legacy = data.get("files", [])
        if isinstance(legacy, list) and legacy and legacy[0].get("parentId") is not None:
            return list(legacy)
        return []

    def _sync_tree_files(self, data: dict, files: list[dict]) -> None:
        normalized = [self._normalize_file_item(item) for item in files]
        manager = self._files_manager(data)
        manager["initialFiles"] = deepcopy(normalized)
        data["files"] = deepcopy(normalized)

    @staticmethod
    def _normalize_file_item(raw: dict) -> dict:
        now = datetime.now(UTC).isoformat()
        file_type = raw.get("type") or "document"
        if file_type not in RegionStoreService._FILE_TYPES:
            file_type = "etc"
        permission = raw.get("permission") or "private"
        if permission not in RegionStoreService._PERMISSIONS:
            permission = "private"
        parent_id = raw.get("parentId")
        item: dict[str, Any] = {
            "id": str(raw.get("id") or f"file-{uuid.uuid4().hex[:12]}"),
            "name": str(raw.get("name") or "이름 없음").strip() or "이름 없음",
            "type": file_type,
            "parentId": parent_id if parent_id else None,
            "createdAt": raw.get("createdAt") or now,
            "modifiedAt": raw.get("modifiedAt") or now,
            "permission": permission,
        }
        if raw.get("size") is not None:
            item["size"] = str(raw.get("size"))
        if raw.get("taskId"):
            item["taskId"] = str(raw["taskId"])
        if raw.get("taskName"):
            item["taskName"] = str(raw["taskName"])
        if raw.get("starred") is not None:
            item["starred"] = bool(raw["starred"])
        shared = raw.get("shared")
        if shared is not None:
            item["shared"] = bool(shared)
        else:
            item["shared"] = permission != "private"
        if raw.get("storageKey"):
            item["storageKey"] = str(raw["storageKey"])
            item["hasContent"] = True
        if raw.get("mimeType"):
            item["mimeType"] = str(raw["mimeType"])
        return item

    @staticmethod
    def _infer_file_type(filename: str) -> str:
        lower = filename.lower()
        if lower.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg")):
            return "image"
        if lower.endswith((".xlsx", ".xls", ".csv")):
            return "spreadsheet"
        if lower.endswith(".pdf"):
            return "pdf"
        if lower.endswith((".mp4", ".mov", ".avi", ".webm")):
            return "video"
        if lower.endswith((".zip", ".rar", ".7z")):
            return "archive"
        if lower.endswith((".doc", ".docx", ".hwp", ".hwpx", ".txt", ".md")):
            return "document"
        return "etc"

    def _purge_storage_for_items(self, region_id: str, items: list[dict]) -> None:
        for item in items:
            if item.get("type") == "folder":
                continue
            self._file_storage.delete(region_id, item.get("storageKey"))

    @staticmethod
    def _collect_descendant_ids(files: list[dict], folder_id: str) -> set[str]:
        by_parent: dict[str | None, list[str]] = {}
        for entry in files:
            parent = entry.get("parentId")
            by_parent.setdefault(parent, []).append(str(entry["id"]))
        result: set[str] = set()
        stack = list(by_parent.get(folder_id, []))
        while stack:
            child_id = stack.pop()
            result.add(child_id)
            stack.extend(by_parent.get(child_id, []))
        return result

    @staticmethod
    def _parse_size_mb(size_raw: str | None) -> float:
        if not size_raw:
            return 0.0
        text = str(size_raw).strip().upper()
        try:
            if "GB" in text:
                return float(text.replace("GB", "").strip()) * 1024.0
            if "MB" in text:
                return float(text.replace("MB", "").strip())
            if "KB" in text:
                return float(text.replace("KB", "").strip()) / 1024.0
            return float(text) / (1024.0 * 1024.0)
        except ValueError:
            return 0.0

    def _folder_label(self, files: list[dict], item: dict) -> str:
        if item.get("folder"):
            return str(item["folder"])
        by_id = {str(f["id"]): f for f in files}
        parts: list[str] = []
        parent_id = item.get("parentId")
        while parent_id:
            parent = by_id.get(str(parent_id))
            if not parent:
                break
            parts.insert(0, str(parent.get("name", "")))
            parent_id = parent.get("parentId")
        return " / ".join(parts) if parts else "루트"

    def _annotate_content_availability(
        self,
        region_id: str,
        files: list[dict],
    ) -> None:
        """storageKey는 있으나 디스크 본문이 없는 항목(컨테이너 재빌드 등) 표시."""
        for item in files:
            if item.get("type") == "folder":
                continue
            storage_key = item.get("storageKey")
            if not storage_key:
                item.pop("hasContent", None)
                item.pop("contentMissing", None)
                continue
            if self._file_storage.exists(region_id, str(storage_key)):
                item["hasContent"] = True
                item.pop("contentMissing", None)
            else:
                item["hasContent"] = False
                item["contentMissing"] = True

    def get_file_manager_state(
        self,
        region_id: str,
        *,
        allowed_task_ids: set[str] | None = None,
    ) -> dict:
        data = self._load(region_id, DOMAIN_FILES)
        manager = self._files_manager(data)
        files = deepcopy(self._get_tree_files(data))
        self._annotate_content_availability(region_id, files)
        if allowed_task_ids is not None:
            files = filter_file_tree(files, allowed_task_ids)
        known_ids = {str(f["id"]) for f in files}
        recent_ids = [
            rid
            for rid in manager.get("defaultRecentIds", [])
            if str(rid) in known_ids
        ]
        task_options = deepcopy(manager.get("taskOptions", []))
        if allowed_task_ids is not None:
            task_options = [
                opt
                for opt in task_options
                if strip_scope(str(opt.get("id") or "")) in allowed_task_ids
            ]
        folder_order = manager.get("folderOrderByParentId", {})
        if not isinstance(folder_order, dict):
            folder_order = {}
        return {
            "files": files,
            "taskOptions": task_options,
            "recentIds": recent_ids,
            "folderOrderByParentId": folder_order,
        }

    def list_files(
        self,
        region_id: str,
        *,
        folder: str | None = None,
        file_type: str | None = None,
        search: str | None = None,
        allowed_task_ids: set[str] | None = None,
    ) -> dict:
        data = self._load(region_id, DOMAIN_FILES)
        tree = self._get_tree_files(data)
        legacy_flat = list(data.get("files", []))
        use_tree = bool(tree)

        if use_tree:
            entries = []
            for item in tree:
                if item.get("type") == "folder":
                    continue
                if not file_entry_allowed(item, allowed_task_ids):
                    continue
                entries.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "type": item["type"],
                        "size": item.get("size", "0 MB"),
                        "modifiedAt": item.get("modifiedAt", ""),
                        "folder": self._folder_label(tree, item),
                        "taskId": item.get("taskId"),
                    }
                )
        else:
            entries = []
            for f in legacy_flat:
                if not file_entry_allowed(f, allowed_task_ids):
                    continue
                entries.append(
                    {
                        "id": f.get("id"),
                        "name": f.get("name"),
                        "type": f.get("type"),
                        "size": f.get("size", "0 MB"),
                        "modifiedAt": f.get("modifiedAt", ""),
                        "folder": f.get("folder", "루트"),
                        "taskId": f.get("taskId"),
                    }
                )

        filtered = entries
        if folder and folder not in self._FILTER_ALL_LABELS:
            filtered = [f for f in filtered if f.get("folder") == folder]
        if file_type and file_type not in self._FILTER_ALL_LABELS:
            filtered = [f for f in filtered if f.get("type") == file_type]
        if search:
            keyword = search.lower()
            filtered = [
                f for f in filtered if keyword in (f.get("name") or "").lower()
            ]

        storage_source = tree if use_tree else legacy_flat
        storage_used = sum(
            self._parse_size_mb(item.get("size")) for item in storage_source
        )
        folders = sorted({f.get("folder") for f in entries if f.get("folder")})
        return {
            "files": filtered,
            "folders": folders,
            "storage": {"used": f"{storage_used:.1f}", "total": 1000, "unit": "MB"},
        }

    def create_file(self, region_id: str, body: dict) -> dict:
        data = self._load(region_id, DOMAIN_FILES)
        files = self._get_tree_files(data)
        created = self._normalize_file_item(
            {
                "id": body.get("id"),
                "name": body.get("name", "새 파일"),
                "type": body.get("type", "document"),
                "parentId": body.get("parentId"),
                "size": body.get("size"),
                "permission": body.get("permission", "private"),
                "taskId": body.get("taskId"),
                "taskName": body.get("taskName"),
                "starred": body.get("starred"),
                "shared": body.get("shared"),
            }
        )
        files.append(created)
        self._sync_tree_files(data, files)
        self._save(region_id, DOMAIN_FILES, data)
        return deepcopy(created)

    def patch_file(self, region_id: str, file_id: str, body: dict) -> dict:
        data = self._load(region_id, DOMAIN_FILES)
        files = self._get_tree_files(data)
        index = next((i for i, f in enumerate(files) if f.get("id") == file_id), None)
        if index is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        current = dict(files[index])
        allowed = {
            "name",
            "type",
            "parentId",
            "size",
            "permission",
            "taskId",
            "taskName",
            "starred",
            "shared",
        }
        for key, value in body.items():
            if key in allowed:
                current[key] = value
        current["modifiedAt"] = datetime.now(UTC).isoformat()
        files[index] = self._normalize_file_item(current)
        self._sync_tree_files(data, files)
        self._save(region_id, DOMAIN_FILES, data)
        return deepcopy(files[index])

    def upload_binary_files(
        self,
        region_id: str,
        uploads: list[tuple[str, bytes, str | None]],
        *,
        parent_id: str | None = None,
        task_id: str | None = None,
        task_name: str | None = None,
    ) -> list[dict]:
        if not uploads:
            return []

        data = self._load(region_id, DOMAIN_FILES)
        files = self._get_tree_files(data)
        if task_id and not task_name:
            manager = self._files_manager(data)
            task_options = manager.get("taskOptions", [])
            match = next(
                (opt for opt in task_options if str(opt.get("id")) == str(task_id)),
                None,
            )
            task_name = match.get("name") if match else None

        created_items: list[dict] = []
        now = datetime.now(UTC).isoformat()

        for filename, content, content_type in uploads:
            file_id = f"file-{uuid.uuid4().hex[:12]}"
            storage_key, mime_type = self._file_storage.write(
                region_id, file_id, filename, content
            )
            item = self._normalize_file_item(
                {
                    "id": file_id,
                    "name": filename,
                    "type": self._infer_file_type(filename),
                    "parentId": parent_id,
                    "size": FileStorageService.format_size(len(content)),
                    "createdAt": now,
                    "modifiedAt": now,
                    "permission": "private",
                    "taskId": task_id,
                    "taskName": task_name,
                    "storageKey": storage_key,
                    "mimeType": content_type or mime_type,
                    "hasContent": True,
                }
            )
            files.append(item)
            created_items.append(item)

        self._sync_tree_files(data, files)
        self._save(region_id, DOMAIN_FILES, data)
        return created_items

    def upsert_task_hwpx_file(
        self,
        region_id: str,
        *,
        task_id: str,
        file_id: str | None,
        filename: str,
        content: bytes,
        content_type: str = "application/hwp+zip",
        task_name: str | None = None,
    ) -> dict:
        """업무별 HWPX — 기존 file_id가 있으면 내용만 갱신, 없으면 새로 업로드."""
        data = self._load(region_id, DOMAIN_FILES)
        files = self._get_tree_files(data)
        now = datetime.now(UTC).isoformat()

        if file_id:
            item = next((f for f in files if f.get("id") == file_id), None)
            if item is not None:
                storage_key, mime_type = self._file_storage.write(
                    region_id,
                    str(file_id),
                    filename,
                    content,
                )
                item = {
                    **item,
                    "name": filename,
                    "storageKey": storage_key,
                    "mimeType": content_type or mime_type,
                    "size": FileStorageService.format_size(len(content)),
                    "modifiedAt": now,
                    "hasContent": True,
                    "taskId": task_id,
                }
                if task_name:
                    item["taskName"] = task_name
                normalized = self._normalize_file_item(item)
                files = [
                    normalized if f.get("id") == file_id else f for f in files
                ]
                self._sync_tree_files(data, files)
                self._save(region_id, DOMAIN_FILES, data)
                return deepcopy(normalized)

        created = self.upload_binary_files(
            region_id,
            [(filename, content, content_type)],
            task_id=task_id,
            task_name=task_name,
        )
        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="HWPX file upload failed",
            )
        return created[0]

    def copy_file_item(self, region_id: str, file_id: str, body: dict) -> dict:
        data = self._load(region_id, DOMAIN_FILES)
        files = self._get_tree_files(data)
        source = next((f for f in files if f.get("id") == file_id), None)
        if not source:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        parent_id = body.get("parentId")
        if parent_id is None:
            parent_id = source.get("parentId")

        now = datetime.now(UTC).isoformat()
        new_id = f"file-{uuid.uuid4().hex[:12]}"
        copy_name = str(body.get("name") or f"{source.get('name', '파일')} 사본").strip()

        if source.get("type") == "folder":
            id_map: dict[str, str] = {file_id: new_id}
            descendants = self._collect_descendant_ids(files, file_id)
            for old_id in descendants:
                id_map[old_id] = f"file-{uuid.uuid4().hex[:12]}"

            by_parent: dict[str | None, list[str]] = {}
            for entry in files:
                parent = entry.get("parentId")
                by_parent.setdefault(parent, []).append(str(entry["id"]))

            bfs_order: list[str] = []
            stack = list(by_parent.get(file_id, []))
            while stack:
                child_id = stack.pop(0)
                if child_id not in descendants:
                    continue
                bfs_order.append(child_id)
                stack.extend(by_parent.get(child_id, []))

            clones: list[dict] = []
            root_clone = self._normalize_file_item(
                {
                    **source,
                    "id": new_id,
                    "name": copy_name,
                    "parentId": parent_id,
                    "createdAt": now,
                    "modifiedAt": now,
                    "storageKey": None,
                }
            )
            clones.append(root_clone)

            for old_id in bfs_order:
                original = next((f for f in files if f.get("id") == old_id), None)
                if not original:
                    continue
                orig_parent = original.get("parentId")
                if orig_parent == file_id:
                    mapped_parent = new_id
                elif orig_parent in id_map:
                    mapped_parent = id_map[str(orig_parent)]
                else:
                    mapped_parent = orig_parent

                clone = dict(original)
                clone["id"] = id_map[old_id]
                clone["parentId"] = mapped_parent
                clone["createdAt"] = now
                clone["modifiedAt"] = now
                if original.get("storageKey"):
                    try:
                        path = self._file_storage.resolve_path(
                            region_id, str(original["storageKey"])
                        )
                        content = path.read_bytes()
                        storage_key, mime_type = self._file_storage.write(
                            region_id,
                            id_map[old_id],
                            str(original.get("name") or "file.bin"),
                            content,
                        )
                        clone["storageKey"] = storage_key
                        clone["mimeType"] = mime_type
                        clone["hasContent"] = True
                    except HTTPException:
                        clone.pop("storageKey", None)
                        clone.pop("hasContent", None)
                clones.append(self._normalize_file_item(clone))

            files.extend(clones)
            self._sync_tree_files(data, files)
            self._save(region_id, DOMAIN_FILES, data)
            return deepcopy(root_clone)

        clone_raw: dict[str, Any] = {
            **source,
            "id": new_id,
            "name": copy_name,
            "parentId": parent_id,
            "createdAt": now,
            "modifiedAt": now,
        }
        if source.get("storageKey"):
            path = self._file_storage.resolve_path(region_id, str(source["storageKey"]))
            content = path.read_bytes()
            storage_key, mime_type = self._file_storage.write(
                region_id,
                new_id,
                str(source.get("name") or "file.bin"),
                content,
            )
            clone_raw["storageKey"] = storage_key
            clone_raw["mimeType"] = mime_type
            clone_raw["hasContent"] = True

        created = self._normalize_file_item(clone_raw)
        files.append(created)
        self._sync_tree_files(data, files)
        self._save(region_id, DOMAIN_FILES, data)
        return deepcopy(created)

    def _zip_path_for_item(
        self,
        files: list[dict],
        item: dict,
        export_root_ids: set[str],
    ) -> str:
        by_id = {str(f.get("id")): f for f in files if f.get("id")}
        chain: list[dict] = []
        current: dict | None = item
        while current:
            chain.insert(0, current)
            item_id = str(current.get("id"))
            if item_id in export_root_ids:
                break
            parent_id = current.get("parentId")
            if not parent_id:
                break
            current = by_id.get(str(parent_id))
        return "/".join(str(part.get("name") or "item") for part in chain)

    def _collect_export_entries(
        self,
        files: list[dict],
        root_ids: list[str],
    ) -> tuple[list[dict], str]:
        included: set[str] = set()
        archive_label = "files-export"

        for root_id in root_ids:
            root = next((f for f in files if str(f.get("id")) == str(root_id)), None)
            if not root:
                continue
            included.add(str(root_id))
            if root.get("type") == "folder":
                included |= self._collect_descendant_ids(files, str(root_id))
                if len(root_ids) == 1:
                    archive_label = str(root.get("name") or archive_label)

        if not included:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="보낼 항목을 찾을 수 없습니다.",
            )

        entries = [f for f in files if str(f.get("id")) in included]
        if len(root_ids) == 1:
            only = next((f for f in files if str(f.get("id")) == str(root_ids[0])), None)
            if only and only.get("type") != "folder":
                archive_label = str(only.get("name") or archive_label)

        return entries, archive_label

    def build_export_archive(
        self,
        region_id: str,
        root_ids: list[str],
        *,
        allowed_task_ids: set[str] | None = None,
    ) -> tuple[bytes, str]:
        import io
        import json
        import zipfile

        data = self._load(region_id, DOMAIN_FILES)
        files = self._get_tree_files(data)
        if allowed_task_ids is not None:
            for root_id in root_ids:
                assert_file_tree_access(files, str(root_id), allowed_task_ids)
            files = filter_file_tree(files, allowed_task_ids)
        export_root_ids = {str(rid) for rid in root_ids}
        entries, archive_label = self._collect_export_entries(files, root_ids)

        buffer = io.BytesIO()
        with zipfile.ZipFile(
            buffer,
            "w",
            zipfile.ZIP_DEFLATED,
            metadata_encoding="utf-8",
        ) as archive:
            manifest = {
                "exportedAt": datetime.now(UTC).isoformat(),
                "rootIds": list(root_ids),
                "items": [
                    {
                        "id": item.get("id"),
                        "name": item.get("name"),
                        "type": item.get("type"),
                        "parentId": item.get("parentId"),
                        "taskId": item.get("taskId"),
                        "taskName": item.get("taskName"),
                        "hasContent": bool(item.get("storageKey")),
                    }
                    for item in entries
                ],
            }
            archive.writestr(
                "_manifest.json",
                json.dumps(manifest, ensure_ascii=False, indent=2),
            )

            for item in entries:
                arc_path = self._zip_path_for_item(files, item, export_root_ids)
                if item.get("type") == "folder":
                    archive.writestr(f"{arc_path}/", b"")
                    continue

                storage_key = item.get("storageKey")
                if storage_key and self._file_storage.exists(region_id, str(storage_key)):
                    path = self._file_storage.resolve_path(region_id, str(storage_key))
                    archive.write(path, arcname=arc_path)
                elif storage_key:
                    archive.writestr(
                        f"{arc_path}.readme.txt",
                        (
                            "서버 저장소에서 파일 본문을 찾을 수 없습니다. "
                            "다시 업로드해 주세요.\n"
                            f"name: {item.get('name')}\n"
                            f"storageKey: {storage_key}\n"
                        ).encode("utf-8"),
                    )
                else:
                    archive.writestr(
                        f"{arc_path}.readme.txt",
                        (
                            "이 항목은 메타데이터만 있고 업로드된 실제 파일이 없습니다.\n"
                            f"name: {item.get('name')}\n"
                        ).encode("utf-8"),
                    )

        buffer.seek(0)
        safe_name = str(archive_label).strip() or "files-export"
        for char in '\\/:*?"<>|':
            safe_name = safe_name.replace(char, "_")
        return buffer.getvalue(), f"{safe_name}.zip"

    def assert_file_access(
        self,
        region_id: str,
        file_id: str,
        *,
        allowed_task_ids: set[str] | None = None,
    ) -> dict:
        data = self._load(region_id, DOMAIN_FILES)
        files = self._get_tree_files(data)
        return assert_file_tree_access(files, file_id, allowed_task_ids)

    def get_download_file(
        self,
        region_id: str,
        file_id: str,
        *,
        allowed_task_ids: set[str] | None = None,
    ) -> tuple[Path, str, str]:
        data = self._load(region_id, DOMAIN_FILES)
        files = self._get_tree_files(data)
        target = assert_file_tree_access(files, file_id, allowed_task_ids)
        if target.get("type") == "folder":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        storage_key = target.get("storageKey")
        if not storage_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="이 파일은 업로드된 실제 파일이 없습니다.",
            )
        path = self._file_storage.resolve_path(region_id, storage_key)
        mime = target.get("mimeType") or "application/octet-stream"
        return path, str(target.get("name") or path.name), mime

    def delete_file(self, region_id: str, file_id: str) -> dict:
        data = self._load(region_id, DOMAIN_FILES)
        files = self._get_tree_files(data)
        target = next((f for f in files if f.get("id") == file_id), None)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        ids_to_delete = {file_id}
        if target.get("type") == "folder":
            ids_to_delete |= self._collect_descendant_ids(files, file_id)

        removed_items = [f for f in files if f.get("id") in ids_to_delete]
        self._purge_storage_for_items(region_id, removed_items)

        next_files = [f for f in files if f.get("id") not in ids_to_delete]
        self._sync_tree_files(data, next_files)
        manager = self._files_manager(data)
        manager["defaultRecentIds"] = [
            rid
            for rid in manager.get("defaultRecentIds", [])
            if str(rid) not in ids_to_delete
        ]
        self._save(region_id, DOMAIN_FILES, data)
        return {"success": True, "deletedId": file_id, "deletedIds": list(ids_to_delete)}

    def save_files_manager_state(self, region_id: str, body: dict) -> dict:
        data = self._load(region_id, DOMAIN_FILES)
        manager = self._files_manager(data)

        if "files" in body and isinstance(body["files"], list):
            old_files = self._get_tree_files(data)
            old_by_id = {str(f["id"]): f for f in old_files}
            new_files_raw = body["files"]
            new_by_id = {str(f["id"]): f for f in new_files_raw if f.get("id")}
            removed = [
                old_by_id[rid]
                for rid in old_by_id
                if rid not in new_by_id
            ]
            self._purge_storage_for_items(region_id, removed)
            self._sync_tree_files(data, new_files_raw)

        if "recentIds" in body and isinstance(body["recentIds"], list):
            known_ids = {str(f["id"]) for f in self._get_tree_files(data)}
            manager["defaultRecentIds"] = [
                str(rid) for rid in body["recentIds"] if str(rid) in known_ids
            ][:20]

        if "folderOrderByParentId" in body and isinstance(body["folderOrderByParentId"], dict):
            # 폴더별 정렬은 UI 힌트이므로 값 검증은 최소화
            next_order: dict[str, list[str]] = {}
            for key, value in body["folderOrderByParentId"].items():
                if not isinstance(value, list):
                    continue
                next_order[str(key)] = [str(x) for x in value if str(x)]
            manager["folderOrderByParentId"] = next_order

        self._save(region_id, DOMAIN_FILES, data)
        return self.get_file_manager_state(region_id)

    # --- performance ---

    def _performance_runtime(self, data: dict) -> dict:
        runtime = data.setdefault("runtime", {})
        perf = runtime.setdefault("performance", {})
        perf.setdefault("inputManagementByTaskId", {})
        return perf

    def _migrate_legacy_performance_to_buckets(self, data: dict) -> None:
        """공용 inputManagementRows → 업무별 inputManagementByTaskId (1회)."""
        runtime = self._performance_runtime(data)
        if runtime.get("legacyBucketsMigrated"):
            return

        bucket = runtime["inputManagementByTaskId"]
        legacy = data.get("inputManagementRows")
        if not isinstance(legacy, list):
            legacy = []

        untagged: list[dict] = []
        for row in legacy:
            if not isinstance(row, dict):
                continue
            raw_tid = row.get("taskId")
            if raw_tid:
                tid = self._normalize_task_id(str(raw_tid))
                bucket.setdefault(tid, []).append(deepcopy(row))
            else:
                untagged.append(deepcopy(row))

        if untagged and not runtime.get("legacyMigratedToTask2"):
            tid = "task2"
            bucket[tid] = [*bucket.get(tid, []), *untagged]
            for row in bucket[tid]:
                row["taskId"] = tid
            runtime["legacyMigratedToTask2"] = True

        data["inputManagementRows"] = []
        runtime["legacyBucketsMigrated"] = True

    @staticmethod
    def _normalize_task_id(task_id: str) -> str:
        return strip_scope(task_id.strip())

    @staticmethod
    def _is_stale_uniform_performance_bootstrap(rows: list, task_id: str) -> bool:
        """구 시드(마지막 글자 숫자)로 생성된 동일 초기 행 — UUID 업무 구분용."""
        if len(rows) != 1:
            return False
        row = rows[0]
        return (
            row.get("id") == f"perf-{task_id}-1"
            and row.get("month") == "1월"
            and row.get("planPeople") == 10
            and row.get("planBudget") == 50000
            and row.get("actualExpense") == 48000
        )

    def _bootstrap_input_rows_for_task(
        self,
        data: dict,
        task_id: str,
        task_title: str | None,
    ) -> list[dict]:
        # 신규 카드는 기본 실적 행 없이 빈 표로 시작 — 데모 업무만 시드한다.
        if task_id not in _DEMO_SEED_TASK_IDS:
            return []

        title = (task_title or "").strip() or task_id

        if task_id == "task5":
            return [
                {
                    "id": f"perf-{task_id}-1",
                    "selected": False,
                    "subProject": title,
                    "detailCategory": "프로그램진행",
                    "month": "4월",
                    "planPeople": 30,
                    "planCount": 4,
                    "planBudget": 1200000,
                    "actualPeople": 28,
                    "actualCount": 4,
                    "actualExpense": 1150000,
                    "content": "스마트폰 활용 교육",
                    "taskId": task_id,
                },
                {
                    "id": f"perf-{task_id}-2",
                    "selected": False,
                    "subProject": title,
                    "detailCategory": "홍보",
                    "month": "3월",
                    "planPeople": 0,
                    "planCount": 2,
                    "planBudget": 0,
                    "actualPeople": 0,
                    "actualCount": 2,
                    "actualExpense": 0,
                    "content": "교육 일정 안내 게시",
                    "taskId": task_id,
                },
            ]

        seed_month = {"task1": "2월", "task3": "6월", "task4": "9월", "task6": "7월"}.get(
            task_id, task_performance_seed_month(task_id)
        )
        seed_digit = task_performance_seed_index(task_id)
        return [
            {
                "id": f"perf-{task_id}-1",
                "selected": False,
                "subProject": title,
                "detailCategory": "프로그램진행",
                "month": seed_month,
                "planPeople": seed_digit * 10,
                "planCount": seed_digit * 2,
                "planBudget": seed_digit * 50000,
                "actualPeople": max(0, seed_digit * 10 - 2),
                "actualCount": seed_digit * 2,
                "actualExpense": seed_digit * 48000,
                "content": f"{title} 실적",
                "taskId": task_id,
            }
        ]

    def _get_or_create_input_rows(
        self,
        data: dict,
        task_id: str,
        *,
        task_title: str | None = None,
    ) -> list[dict]:
        self._migrate_legacy_performance_to_buckets(data)
        tid = self._normalize_task_id(task_id)
        runtime = self._performance_runtime(data)
        bucket = runtime["inputManagementByTaskId"]

        if tid in bucket:
            stored = bucket[tid]
            if task_title and self._is_stale_uniform_performance_bootstrap(
                stored, tid
            ):
                refreshed = self._bootstrap_input_rows_for_task(
                    data, tid, task_title
                )
                bucket[tid] = refreshed
                return refreshed
            return stored

        rows = self._bootstrap_input_rows_for_task(data, tid, task_title)
        bucket[tid] = rows
        return rows

    def _read_input_rows_for_report(
        self,
        region_id: str,
        task_id: str,
        *,
        task_title: str | None = None,
    ) -> list[dict]:
        """사업문서 집계용 — DB에 쓰지 않고 메모리에서만 행을 읽음."""
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        self._migrate_legacy_performance_to_buckets(data)
        tid = self._normalize_task_id(task_id)
        runtime = self._performance_runtime(data)
        bucket = runtime["inputManagementByTaskId"]

        if tid in bucket:
            return deepcopy(bucket[tid])

        return deepcopy(
            self._bootstrap_input_rows_for_task(data, tid, task_title)
        )

    def _read_business_plan_for_report(
        self,
        region_id: str,
        task_id: str,
        *,
        task_title: str | None = None,
    ) -> dict:
        """사업계획서 집계용 — task_detail 사업계획 문서(읽기 전용)."""
        data = self._load(region_id, DOMAIN_TASK_DETAIL)
        doc = self._get_or_create_business_plan_doc(
            data,
            task_id,
            card_title=task_title,
        )
        return deepcopy(doc)

    def aggregate_input_management_rows(self, region_id: str) -> list:
        """챗봇·리포트용: 업무별 버킷 + 레거시 행을 읽기 전용으로 합침 (저장 경로 아님)."""
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        runtime = self._performance_runtime(data)
        bucket = runtime.get("inputManagementByTaskId", {})
        rows: list = []
        if isinstance(bucket, dict):
            for task_rows in bucket.values():
                if isinstance(task_rows, list):
                    rows.extend(deepcopy(task_rows))
        legacy = data.get("inputManagementRows") or []
        if isinstance(legacy, list):
            rows.extend(deepcopy(legacy))
        return rows

    def get_input_management_rows(
        self,
        region_id: str,
        task_id: str,
        *,
        task_title: str | None = None,
    ) -> list:
        if not task_id or not str(task_id).strip():
            raise ValueError("taskId is required")
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        self._migrate_legacy_performance_to_buckets(data)
        rows = self._get_or_create_input_rows(data, task_id, task_title=task_title)
        self._save(region_id, DOMAIN_PERFORMANCE, data)
        return deepcopy(rows)

    def get_performance_input_meta(self, region_id: str) -> dict:
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        chips = data.get("performanceSubProjectChips") or []
        categories = data.get("defaultDetailCategories") or []
        return {
            "subProjectChips": deepcopy(chips if isinstance(chips, list) else []),
            "detailCategories": list(categories) if isinstance(categories, list) else [],
        }

    def _performance_rows_list(self, data: dict) -> list[dict]:
        """입력관리 행이 단일 소스 (프론트 performance-provider와 동일)."""
        rows = data.get("inputManagementRows")
        if rows:
            return list(rows)
        return list(data.get("subProjects", []))

    def _row_to_list_response(self, item: dict, index: int) -> dict:
        if "subProject" in item or "detailCategory" in item:
            return {
                "id": item.get("id") or str(index + 1),
                "selected": bool(item.get("selected", False)),
                "subProject": item.get("subProject", ""),
                "detailCategory": item.get("detailCategory", ""),
                "month": item.get("month", ""),
                "planPeople": item.get("planPeople", 0),
                "planCount": item.get("planCount", 0),
                "planBudget": item.get("planBudget", 0),
                "actualPeople": item.get("actualPeople", 0),
                "actualCount": item.get("actualCount", 0),
                "actualExpense": item.get("actualExpense", 0),
                "content": item.get("content", item.get("name", "")),
                "fundingSources": item.get("fundingSources"),
                "planFunding": item.get("planFunding"),
                "actualFunding": item.get("actualFunding"),
            }
        return {
            "id": item.get("id") or str(index + 1),
            "selected": False,
            "subProject": item.get("name", ""),
            "detailCategory": item.get("category", ""),
            "month": item.get("month", ""),
            "planPeople": item.get("planPeople", 0),
            "planCount": item.get("planCount", 0),
            "planBudget": item.get("planBudget", 0),
            "actualPeople": item.get("actualPeople", 0),
            "actualCount": item.get("actualCount", 0),
            "actualExpense": 0,
            "content": item.get("name", ""),
        }

    def get_performance_rows(
        self,
        region_id: str,
        *,
        project_id: str | None = None,
        month: str | None = None,
    ) -> dict:
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        source = self._performance_rows_list(data)
        filtered = source
        if project_id:
            filtered = [
                item
                for item in filtered
                if item.get("projectId") == project_id
            ]
        if month:
            filtered = [item for item in filtered if item.get("month") == month]

        rows = [
            self._row_to_list_response(item, index)
            for index, item in enumerate(filtered)
        ]

        return {
            "data": rows,
            "totals": {
                "planPeople": sum(r.get("planPeople", 0) for r in rows),
                "planCount": sum(r.get("planCount", 0) for r in rows),
                "planBudget": sum(r.get("planBudget", 0) for r in rows),
                "actualPeople": sum(r.get("actualPeople", 0) for r in rows),
                "actualCount": sum(r.get("actualCount", 0) for r in rows),
            },
            "count": len(rows),
        }

    def save_input_management_rows(
        self,
        region_id: str,
        rows: list,
        *,
        task_id: str,
        user: str = "시스템",
    ) -> dict:
        if not task_id or not str(task_id).strip():
            raise ValueError("taskId is required")
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        normalized = [deepcopy(row) for row in rows]
        tid = self._normalize_task_id(task_id)
        for row in normalized:
            row["taskId"] = tid
        self._performance_runtime(data)["inputManagementByTaskId"][tid] = normalized
        self._save(region_id, DOMAIN_PERFORMANCE, data)
        self.append_version_entry(
            region_id,
            action="실적 입력 데이터를 저장했습니다.",
            target="실적관리",
            action_type="update_title",
            project_name="실적관리",
            user=user,
        )
        return {"success": True, "count": len(normalized)}

    def save_monthly_plan(self, region_id: str, version: str, body: dict) -> dict:
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        plans = data.setdefault("monthlyPlans", {})
        plans[version] = deepcopy(body)
        self._save(region_id, DOMAIN_PERFORMANCE, data)
        return deepcopy(plans[version])

    def get_monthly_plan(self, region_id: str, version: str = "기본계획") -> dict:
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        plans = data.get("monthlyPlans", {})
        plan = plans.get(version) or plans.get("기본계획")
        if not plan:
            months = data.get("monthlyPlanMonths", [])
            return {"months": months, "data": {"version": version, "rows": []}}
        return deepcopy(plan)

    def create_performance_record(self, region_id: str, body: dict) -> dict:
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        created = {"id": f"sub{int(datetime.now(UTC).timestamp() * 1000)}", **body}
        rows = data.setdefault("inputManagementRows", [])
        rows.append(created)
        self._save(region_id, DOMAIN_PERFORMANCE, data)
        return deepcopy(created)

    def update_performance_record(self, region_id: str, body: dict) -> dict:
        record_id = body.get("id")
        if not record_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Record ID required")
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        rows = data.setdefault("inputManagementRows", [])
        for index, row in enumerate(rows):
            if row.get("id") == record_id:
                updated = {**row, **{k: v for k, v in body.items() if k != "id"}}
                rows[index] = updated
                self._save(region_id, DOMAIN_PERFORMANCE, data)
                return deepcopy(updated)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    def delete_performance_record(self, region_id: str, record_id: str) -> dict:
        data = self._load(region_id, DOMAIN_PERFORMANCE)
        rows = data.get("inputManagementRows", [])
        next_rows = [r for r in rows if r.get("id") != record_id]
        if len(next_rows) == len(rows):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
        data["inputManagementRows"] = next_rows
        self._save(region_id, DOMAIN_PERFORMANCE, data)
        return {"success": True, "deletedId": record_id}

    # --- reports ---

    def save_reports(self, region_id: str, body: dict, report_type: str | None = None) -> dict:
        data = self._load(region_id, DOMAIN_REPORTS)
        if report_type == "performance":
            data["performanceReportRows"] = deepcopy(
                body.get("performanceRows", body)
            )
        elif report_type == "budget":
            data["budgetReportRows"] = deepcopy(body.get("budgetRows", body))
        elif report_type in ("business-plan", "businessPlan"):
            data["businessPlanReportMock"] = deepcopy(body.get("businessPlan", body))
        else:
            if "performanceRows" in body:
                data["performanceReportRows"] = deepcopy(body["performanceRows"])
            if "budgetRows" in body:
                data["budgetReportRows"] = deepcopy(body["budgetRows"])
            if "businessPlan" in body:
                data["businessPlanReportMock"] = deepcopy(body["businessPlan"])
        self._save(region_id, DOMAIN_REPORTS, data)
        return self.get_reports(region_id, report_type)

    def get_performance_summary(
        self,
        region_id: str,
        task_id: str | None = None,
    ) -> dict:
        if task_id and str(task_id).strip():
            rows = self.get_input_management_rows(region_id, task_id)
        else:
            rows = self.aggregate_input_management_rows(region_id)
        grouped: dict[str, dict] = {}
        for row in rows:
            key = f"{row.get('subProject', '')}::{row.get('detailCategory', '')}"
            if key not in grouped:
                grouped[key] = {
                    "id": row.get("id", key),
                    "subProject": row.get("subProject", ""),
                    "detailCategory": row.get("detailCategory", ""),
                    "fundingSources": row.get("fundingSources") or [],
                    "plan": {"total": {"people": 0, "count": 0, "budget": 0}, "monthly": {}},
                    "actual": {"total": {"people": 0, "count": 0, "budget": 0}, "monthly": {}},
                }
            entry = grouped[key]
            month = row.get("month", "")
            for side, prefix in (("plan", "plan"), ("actual", "actual")):
                people = row.get(f"{prefix}People", 0) or 0
                count = row.get(f"{prefix}Count", 0) or 0
                budget = row.get(f"{prefix}Budget", 0) or 0
                if side == "actual":
                    budget = row.get("actualExpense", 0) or budget
                entry[side]["total"]["people"] += people
                entry[side]["total"]["count"] += count
                entry[side]["total"]["budget"] += budget
                if month:
                    monthly = entry[side]["monthly"].setdefault(
                        month, {"people": 0, "count": 0, "budget": 0}
                    )
                    monthly["people"] += people
                    monthly["count"] += count
                    monthly["budget"] += budget
        return {"rows": list(grouped.values())}

    def get_reports(
        self,
        region_id: str,
        report_type: str | None = None,
        *,
        year: int | None = None,
        quarter: int = 1,
        period_mode: str = "quarter",
        kanban_projects: list[dict] | None = None,
    ) -> dict:
        data = self._load(region_id, DOMAIN_REPORTS)
        if kanban_projects is not None:
            report_year = year if year is not None else datetime.now(UTC).year
            load_rows = lambda task_id, title: self._read_input_rows_for_report(
                region_id,
                task_id,
                task_title=title,
            )
            performance_rows = build_performance_report_rows(
                kanban_projects,
                load_rows,
                year=report_year,
                quarter=quarter,
                period_mode=period_mode or "quarter",
            )
            budget_rows = build_budget_report_rows(
                kanban_projects,
                load_rows,
                year=report_year,
            )
            business_plan = build_business_plan_report(
                kanban_projects,
                load_rows,
                lambda task_id, title: self._read_business_plan_for_report(
                    region_id,
                    task_id,
                    task_title=title,
                ),
                year=report_year,
            )
        else:
            performance_rows = deepcopy(data.get("performanceReportRows", []))
            budget_rows = deepcopy(data.get("budgetReportRows", []))
            business_plan = deepcopy(data.get("businessPlanReportMock", {}))

        full = {
            "performanceRows": performance_rows,
            "budgetRows": budget_rows,
            "businessPlan": business_plan,
        }
        if report_type == "performance":
            return {"performanceRows": full["performanceRows"]}
        if report_type == "budget":
            return {"budgetRows": full["budgetRows"]}
        if report_type in ("business-plan", "businessPlan"):
            return {"businessPlan": full["businessPlan"]}
        return full

    # --- version history ---

    def list_version_history(
        self,
        region_id: str,
        *,
        year: str | None = None,
        action_type: str | None = None,
        query: str | None = None,
    ) -> list:
        data = self._load(region_id, DOMAIN_VERSION_HISTORY)
        restored_ids = set(data.get("restoredIds", []))
        entries = []
        for entry in data.get("entries", []):
            item = deepcopy(entry)
            item["canRestore"] = bool(
                item.get("canRestore") and item.get("id") not in restored_ids
            )
            entries.append(item)

        if year:
            year_str = str(year).strip()
            entries = [
                e
                for e in entries
                if str(e.get("year", "")) == year_str
                or (not e.get("year") and year_str in str(e.get("date", "")))
            ]

        if action_type and action_type != "all":
            entries = [e for e in entries if e.get("actionType") == action_type]

        keyword = (query or "").strip().lower()
        if keyword:
            entries = [
                e
                for e in entries
                if keyword in (e.get("user") or "").lower()
                or keyword in (e.get("target") or "").lower()
                or keyword in (e.get("action") or "").lower()
                or keyword in (e.get("projectName") or "").lower()
            ]

        entries.sort(key=lambda e: e.get("date", ""), reverse=True)
        return entries

    def append_version_entry(
        self,
        region_id: str,
        *,
        action: str,
        target: str,
        action_type: str = "update_title",
        project_name: str = "",
        user: str = "시스템",
        user_team: str = "",
        year: str | None = None,
        can_restore: bool = False,
        changes: list[dict] | None = None,
        meta: dict[str, Any] | None = None,
    ) -> str | None:
        try:
            data = self._load(region_id, DOMAIN_VERSION_HISTORY)
        except HTTPException:
            return None
        entries = data.setdefault("entries", [])
        kst_now = now_kst()
        entry_id = f"vh-{int(kst_now.timestamp() * 1000)}"
        entry: dict[str, Any] = {
            "id": entry_id,
            "date": format_kst_datetime(kst_now),
            "user": user,
            "action": action,
            "target": target,
            "actionType": action_type,
            "projectName": project_name,
            "year": year or kst_year(kst_now),
            "canRestore": can_restore,
            "changes": deepcopy(changes) if changes else [],
        }
        if user_team:
            entry["userTeam"] = user_team
        if meta:
            entry["meta"] = deepcopy(meta)
        entries.insert(0, entry)
        self._save(region_id, DOMAIN_VERSION_HISTORY, data)
        return entry_id

    def get_version_entry(
        self, region_id: str, history_id: str
    ) -> tuple[dict[str, Any] | None, set[str]]:
        data = self._load(region_id, DOMAIN_VERSION_HISTORY)
        restored_ids = set(data.get("restoredIds", []))
        entry = next(
            (deepcopy(e) for e in data.get("entries", []) if e.get("id") == history_id),
            None,
        )
        if entry:
            entry["canRestore"] = bool(
                entry.get("canRestore") and history_id not in restored_ids
            )
        return entry, restored_ids

    def mark_version_restored(self, region_id: str, history_id: str) -> None:
        data = self._load(region_id, DOMAIN_VERSION_HISTORY)
        restored_ids: list[str] = list(data.get("restoredIds", []))
        if history_id not in restored_ids:
            restored_ids.append(history_id)
        data["restoredIds"] = restored_ids
        self._save(region_id, DOMAIN_VERSION_HISTORY, data)

    def restore_version_history(self, region_id: str, history_id: str) -> dict:
        """레거시 — 실제 복원은 KanbanBoardService.restore_version_entry 사용."""
        entry, restored_ids = self.get_version_entry(region_id, history_id)
        if not entry:
            return {
                "success": False,
                "historyId": history_id,
                "message": "해당 이력을 찾을 수 없습니다.",
            }
        if not entry.get("canRestore") or history_id in restored_ids:
            return {
                "success": False,
                "historyId": history_id,
                "message": "복원할 수 없는 이력입니다.",
            }
        self.mark_version_restored(region_id, history_id)
        target = entry.get("target", "")
        return {
            "success": True,
            "historyId": history_id,
            "message": f'"{target}" 항목을 복원했습니다.',
        }

    # --- task detail ---

    def _task_runtime(self, data: dict) -> dict:
        runtime = data.setdefault(
            "runtime",
            {
                "evaluationByTaskId": {},
                "businessPlanByTaskId": {},
                "surveysByTaskId": {},
            },
        )
        runtime.setdefault("evaluationByTaskId", {})
        runtime.setdefault("businessPlanByTaskId", {})
        runtime.setdefault("surveysByTaskId", {})
        return runtime

    @staticmethod
    def _normalize_task_id(task_id: str) -> str:
        return normalize_task_id(task_id)

    def _clone_evaluation(self, source: dict) -> dict:
        result = deepcopy(source)
        result["goals"] = list(result.get("goals", []))
        result["detailRows"] = [deepcopy(r) for r in result.get("detailRows", [])]
        result["sections"] = [deepcopy(s) for s in result.get("sections", [])]
        return result

    def _get_or_create_evaluation(
        self,
        data: dict,
        task_id: str,
        *,
        card_title: str | None = None,
    ) -> dict:
        tid = self._normalize_task_id(task_id)
        runtime = self._task_runtime(data)
        stored = runtime["evaluationByTaskId"].get(tid)
        if stored:
            return stored
        created = bootstrap_evaluation(data, tid, card_title=card_title)
        runtime["evaluationByTaskId"][tid] = created
        return created

    def _get_or_create_business_plan_doc(
        self,
        data: dict,
        task_id: str,
        *,
        card_title: str | None = None,
    ) -> dict:
        tid = self._normalize_task_id(task_id)
        runtime = self._task_runtime(data)
        stored = runtime["businessPlanByTaskId"].get(tid)
        if stored:
            return stored
        created = bootstrap_business_plan(data, tid, card_title=card_title)
        runtime["businessPlanByTaskId"][tid] = created
        return created

    def _get_or_create_task_surveys(
        self,
        data: dict,
        task_id: str,
        *,
        card_title: str | None = None,
    ) -> list[dict]:
        tid = self._normalize_task_id(task_id)
        runtime = self._task_runtime(data)
        stored = runtime["surveysByTaskId"].get(tid)
        if stored:
            return stored
        created = bootstrap_task_surveys(data, tid, card_title=card_title)
        runtime["surveysByTaskId"][tid] = created
        return created

    def list_task_surveys(
        self,
        region_id: str,
        task_id: str,
        *,
        card_title: str | None = None,
    ) -> list:
        items = self._surveys.list_for_task(
            region_id, task_id, card_title=card_title
        )
        return [
            {
                "id": item["id"],
                "title": item["title"],
                "program": item.get("program", ""),
                "date": item.get("date", ""),
                "status": item.get("status", ""),
                "endDate": item.get("endDate", ""),
            }
            for item in items
        ]

    @staticmethod
    def _reference_file_type_label(item: dict) -> str:
        name = str(item.get("name") or "")
        mime = str(item.get("mimeType") or "").lower()
        if name.lower().endswith(".hwpx") or "hwp" in mime:
            return "한글"
        file_type = str(item.get("type") or "document")
        labels = {
            "image": "이미지",
            "pdf": "PDF",
            "document": "문서",
            "spreadsheet": "스프레드시트",
            "video": "동영상",
            "archive": "압축",
            "etc": "기타",
        }
        return labels.get(file_type, "첨부")

    @staticmethod
    def _merge_reference_file_lists(*groups: list[dict]) -> list[dict]:
        """참고 문서 목록 — id 기준 중복 제거, 앞쪽 그룹 우선."""
        seen: set[str] = set()
        merged: list[dict] = []
        for group in groups:
            for item in group:
                fid = str(item.get("id") or "")
                if not fid or fid in seen:
                    continue
                seen.add(fid)
                merged.append(item)
        return merged

    def _file_manager_reference_entry(self, region_id: str, item: dict) -> dict:
        entry: dict = {
            "id": str(item.get("id")),
            "name": str(item.get("name") or "파일"),
            "type": self._reference_file_type_label(item),
            "source": "file-manager",
            "mimeType": item.get("mimeType"),
            "fileType": item.get("type"),
        }
        storage_key = item.get("storageKey")
        if not storage_key:
            return entry
        if self._file_storage.exists(region_id, str(storage_key)):
            entry["hasContent"] = True
        else:
            entry["hasContent"] = False
            entry["contentMissing"] = True
        return entry

    def get_evaluation_files(self, region_id: str, task_id: str | None = None) -> list:
        """업무(taskId) 관련 문서 — 시드 참고 문서 + 파일관리 첨부 + 저장 HWPX."""
        data = self._load(region_id, DOMAIN_TASK_DETAIL)
        legacy = deepcopy(data.get("filesData", []))

        if not task_id or not str(task_id).strip():
            return legacy

        tid = self._normalize_task_id(str(task_id))
        files_store = self._load(region_id, DOMAIN_FILES)
        tree_files = self._get_tree_files(files_store)
        by_id = {
            str(item.get("id")): item
            for item in tree_files
            if item.get("type") != "folder" and item.get("id")
        }

        task_files: list[dict] = []
        for item in tree_files:
            if item.get("type") == "folder":
                continue
            raw_tid = item.get("taskId")
            if not raw_tid:
                continue
            if self._normalize_task_id(str(raw_tid)) != tid:
                continue
            task_files.append(self._file_manager_reference_entry(region_id, item))

        runtime = self._task_runtime(data)
        linked_hwpx_ids: list[str] = []
        plan = runtime.get("businessPlanByTaskId", {}).get(tid)
        if isinstance(plan, dict) and plan.get("hwpxFileId"):
            linked_hwpx_ids.append(str(plan["hwpxFileId"]))
        evaluation = runtime.get("evaluationByTaskId", {}).get(tid)
        if isinstance(evaluation, dict) and evaluation.get("hwpxFileId"):
            linked_hwpx_ids.append(str(evaluation["hwpxFileId"]))

        task_file_ids = {str(f.get("id")) for f in task_files}
        for fid in linked_hwpx_ids:
            if fid in task_file_ids:
                continue
            item = by_id.get(fid)
            if item is None:
                continue
            task_files.append(self._file_manager_reference_entry(region_id, item))
            task_file_ids.add(fid)

        return self._merge_reference_file_lists(legacy, task_files)

    def get_view_together_files(self, region_id: str) -> list:
        data = self._load(region_id, DOMAIN_TASK_DETAIL)
        return deepcopy(data.get("viewTogetherFixedFiles", []))

    def get_evaluation_template(
        self,
        region_id: str,
        task_id: str,
        *,
        card_title: str | None = None,
    ) -> dict:
        data = self._load(region_id, DOMAIN_TASK_DETAIL)
        tid = self._normalize_task_id(task_id)
        runtime = self._task_runtime(data)
        source = runtime["evaluationByTaskId"].get(tid)
        if not source:
            source = self._get_or_create_evaluation(data, task_id, card_title=card_title)
            self._save(region_id, DOMAIN_TASK_DETAIL, data)
        return {
            "performanceIndicator": source.get("performanceIndicator", ""),
            "evaluationTool": source.get("evaluationTool", ""),
            "keyFactorAnalysis": source.get("keyFactorAnalysis", ""),
            "goalAppropriacy": source.get("goalAppropriacy", ""),
            "suggestion": source.get("suggestion", ""),
            "detailRows": deepcopy(source.get("detailRows", [])),
            "sections": deepcopy(source.get("sections", [])),
        }

    def get_business_evaluation(
        self,
        region_id: str,
        task_id: str,
        *,
        card_title: str | None = None,
    ) -> dict:
        data = self._load(region_id, DOMAIN_TASK_DETAIL)
        tid = self._normalize_task_id(task_id)
        runtime = self._task_runtime(data)
        stored = runtime["evaluationByTaskId"].get(tid)
        if stored:
            return self._sync_evaluation_detail_rows_from_performance(
                region_id,
                task_id,
                self._clone_evaluation(stored),
            )
        doc = self._get_or_create_evaluation(data, task_id, card_title=card_title)
        self._save(region_id, DOMAIN_TASK_DETAIL, data)
        return self._sync_evaluation_detail_rows_from_performance(
            region_id,
            task_id,
            self._clone_evaluation(doc),
        )

    def save_business_evaluation(
        self,
        region_id: str,
        task_id: str,
        payload: dict,
        *,
        user: str = "시스템",
        card_title: str | None = None,
    ) -> dict:
        saved = self.save_task_documents(
            region_id,
            task_id,
            evaluation=payload,
            user=user,
            card_title=card_title,
        )
        return saved["evaluation"]

    def complete_business_evaluation(
        self,
        region_id: str,
        task_id: str,
        *,
        user: str = "시스템",
        card_title: str | None = None,
    ) -> dict:
        data = self._load(region_id, DOMAIN_TASK_DETAIL)
        tid = self._normalize_task_id(task_id)
        current = self._get_or_create_evaluation(data, tid, card_title=card_title)
        next_eval = {**current, "isCompleted": True}
        plan_form = None
        plan_stored = self._task_runtime(data)["businessPlanByTaskId"].get(tid)
        if isinstance(plan_stored, dict):
            plan_form = plan_stored.get("formData")
        from app.application.hwpx.task_hwpx_sync import try_sync_evaluation_hwpx

        try_sync_evaluation_hwpx(
            self,
            region_id,
            task_id,
            next_eval,
            plan_form=plan_form if isinstance(plan_form, dict) else None,
            card_title=card_title,
        )
        self._task_runtime(data)["evaluationByTaskId"][tid] = next_eval
        self._save(region_id, DOMAIN_TASK_DETAIL, data)
        program_name = next_eval.get("programName") or business_name_for_task(
            tid, card_title=card_title
        )
        self.append_version_entry(
            region_id,
            action="사업평가를 완료했습니다.",
            target=program_name,
            action_type="update_description",
            project_name=program_name,
            user=user,
        )
        return self._clone_evaluation(next_eval)

    def _collect_performance_sub_project_names(
        self,
        region_id: str,
        task_id: str,
    ) -> list[str]:
        from app.application.plan_sub_projects import collect_performance_sub_project_names

        data = self._load(region_id, DOMAIN_PERFORMANCE)
        self._migrate_legacy_performance_to_buckets(data)
        tid = self._normalize_task_id(task_id)
        rows = self._performance_runtime(data)["inputManagementByTaskId"].get(tid) or []
        chips = data.get("performanceSubProjectChips") or []
        return collect_performance_sub_project_names(chips=chips, input_rows=rows)

    def _sync_plan_sub_projects_from_performance(
        self,
        region_id: str,
        task_id: str,
        doc: dict,
    ) -> dict:
        from app.application.plan_sub_projects import merge_plan_sub_projects

        names = self._collect_performance_sub_project_names(region_id, task_id)
        if not names:
            return doc
        form = doc.setdefault("formData", {})
        form["subProjects"] = merge_plan_sub_projects(
            form.get("subProjects") or [],
            names,
        )
        return doc

    def _sync_evaluation_detail_rows_from_performance(
        self,
        region_id: str,
        task_id: str,
        evaluation: dict,
    ) -> dict:
        evaluation["detailRows"] = []
        return evaluation

    def _clone_business_plan(self, source: dict) -> dict:
        from app.application.hwpx.render.template_defaults import (
            merge_plan_form_with_template_defaults,
        )

        result = deepcopy(source)
        form = merge_plan_form_with_template_defaults(result.get("formData", {}))
        form["goals"] = list(form.get("goals", []))
        form["subProjects"] = [deepcopy(s) for s in form.get("subProjects", [])]
        result["formData"] = form
        result["sections"] = [deepcopy(s) for s in result.get("sections", [])]
        return result

    def get_business_plan(
        self,
        region_id: str,
        task_id: str,
        *,
        card_title: str | None = None,
    ) -> dict:
        data = self._load(region_id, DOMAIN_TASK_DETAIL)
        tid = self._normalize_task_id(task_id)
        runtime = self._task_runtime(data)
        stored = runtime["businessPlanByTaskId"].get(tid)
        if stored:
            return self._sync_plan_sub_projects_from_performance(
                region_id,
                task_id,
                self._clone_business_plan(stored),
            )
        doc = self._get_or_create_business_plan_doc(data, task_id, card_title=card_title)
        self._save(region_id, DOMAIN_TASK_DETAIL, data)
        return self._sync_plan_sub_projects_from_performance(
            region_id,
            task_id,
            self._clone_business_plan(doc),
        )

    def _merge_business_plan(self, current: dict, payload: dict) -> dict:
        next_doc: dict[str, Any] = {**current}
        if "isCompleted" in payload:
            next_doc["isCompleted"] = payload["isCompleted"]
        if payload.get("formData"):
            form = payload["formData"]
            next_doc["formData"] = {
                **form,
                "goals": list(form.get("goals", [])),
                "subProjects": [deepcopy(s) for s in form.get("subProjects", [])],
            }
        if "sections" in payload:
            next_doc["sections"] = [deepcopy(s) for s in payload["sections"]]
        return next_doc

    def _merge_business_evaluation(self, current: dict, payload: dict) -> dict:
        next_eval = {**current, **payload}
        if "goals" in payload:
            next_eval["goals"] = list(payload["goals"])
        if "detailRows" in payload:
            next_eval["detailRows"] = [deepcopy(r) for r in payload["detailRows"]]
        if "sections" in payload:
            next_eval["sections"] = [deepcopy(s) for s in payload["sections"]]
        return next_eval

    def save_task_documents(
        self,
        region_id: str,
        task_id: str,
        *,
        plan: dict | None = None,
        evaluation: dict | None = None,
        user: str = "시스템",
        card_title: str | None = None,
    ) -> dict[str, Any]:
        """사업계획서·사업평가를 한 번의 JSON 로드/저장으로 처리."""
        if plan is None and evaluation is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="plan or evaluation payload is required",
            )

        data = self._load(region_id, DOMAIN_TASK_DETAIL)
        tid = self._normalize_task_id(task_id)
        runtime = self._task_runtime(data)
        result: dict[str, Any] = {}

        if plan is not None:
            current = self._get_or_create_business_plan_doc(data, tid, card_title=card_title)
            next_doc = self._merge_business_plan(current, plan)
            next_doc = self._sync_plan_sub_projects_from_performance(
                region_id, tid, next_doc
            )
            from app.application.hwpx.task_hwpx_sync import try_sync_plan_hwpx

            try_sync_plan_hwpx(
                self,
                region_id,
                task_id,
                next_doc,
                card_title=card_title,
            )
            runtime["businessPlanByTaskId"][tid] = next_doc
            result["plan"] = self._clone_business_plan(next_doc)

        if evaluation is not None:
            current = self._get_or_create_evaluation(data, tid, card_title=card_title)
            next_eval = self._merge_business_evaluation(current, evaluation)
            next_eval = self._sync_evaluation_detail_rows_from_performance(
                region_id, tid, next_eval
            )
            plan_form = None
            plan_stored = runtime["businessPlanByTaskId"].get(tid)
            if isinstance(plan_stored, dict):
                plan_form = plan_stored.get("formData")
            from app.application.hwpx.task_hwpx_sync import try_sync_evaluation_hwpx

            try_sync_evaluation_hwpx(
                self,
                region_id,
                task_id,
                next_eval,
                plan_form=plan_form if isinstance(plan_form, dict) else None,
                card_title=card_title,
            )
            runtime["evaluationByTaskId"][tid] = next_eval
            result["evaluation"] = self._clone_evaluation(next_eval)

        self._save(region_id, DOMAIN_TASK_DETAIL, data)

        if evaluation is not None:
            program_name = result["evaluation"].get("programName") or business_name_for_task(
                tid, card_title=card_title
            )
            self.append_version_entry(
                region_id,
                action="사업평가를 저장했습니다.",
                target=program_name,
                action_type="update_description",
                project_name=program_name,
                user=user,
            )

        if plan is not None:
            project_name = result["plan"].get("formData", {}).get("projectName") or business_name_for_task(
                tid, card_title=card_title
            )
            self.append_version_entry(
                region_id,
                action="사업계획서를 저장했습니다.",
                target=project_name,
                action_type="update_description",
                project_name=project_name,
                user=user,
            )

        return result

    def save_business_plan(
        self,
        region_id: str,
        task_id: str,
        payload: dict,
        *,
        user: str = "시스템",
        card_title: str | None = None,
    ) -> dict:
        saved = self.save_task_documents(
            region_id,
            task_id,
            plan=payload,
            user=user,
            card_title=card_title,
        )
        return saved["plan"]

    # --- survey (SurveyService) ---

    def list_surveys(
        self,
        region_id: str,
        *,
        task_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ) -> list:
        return self._surveys.list_surveys(
            region_id, task_id=task_id, status=status, search=search
        )

    def get_survey_detail(
        self,
        region_id: str,
        survey_id: str,
        *,
        task_id: str | None = None,
    ) -> dict:
        return self._surveys.get_survey_detail(
            region_id, survey_id, task_id=task_id
        )

    def save_survey(
        self,
        region_id: str,
        survey_id: str,
        payload: dict,
        *,
        task_id: str | None = None,
    ) -> dict:
        return self._surveys.save_survey(
            region_id, survey_id, payload, task_id=task_id
        )

    def get_survey_results(self, region_id: str, survey_id: str) -> dict:
        return self._surveys.get_survey_results(region_id, survey_id)

    def submit_survey_response(
        self, region_id: str, survey_id: str, payload: dict
    ) -> dict:
        return self._surveys.submit_survey_response(region_id, survey_id, payload)

    def delete_survey(self, region_id: str, survey_id: str) -> dict:
        return self._surveys.delete_survey(region_id, survey_id)

    def close_survey(self, region_id: str, survey_id: str) -> dict:
        return self._surveys.close_survey(region_id, survey_id)

    def duplicate_survey(self, region_id: str, survey_id: str) -> dict:
        return self._surveys.duplicate_survey(region_id, survey_id)

    # --- approvals (전자결재) ---

    def list_approvals(self, region_id: str, *, status: str | None = None) -> list:
        return self._approvals.list(region_id, status=status)

    def create_approval(self, region_id: str, body: dict) -> dict:
        return self._approvals.create(region_id, body)

    def update_approval(self, region_id: str, approval_id: str, body: dict) -> dict:
        return self._approvals.update(region_id, approval_id, body)

    def delete_approval(self, region_id: str, approval_id: str) -> dict:
        return self._approvals.delete(region_id, approval_id)

    # --- document templates (사용자 업로드 양식) ---

    def list_document_templates(self, region_id: str) -> list:
        return self._document_templates.list_templates(region_id)

    def create_document_template(
        self,
        region_id: str,
        *,
        filename: str,
        content: bytes,
        created_by: str = "시스템",
        name: str | None = None,
        kind: str | None = None,
    ) -> dict:
        return self._document_templates.create_template(
            region_id,
            filename=filename,
            content=content,
            created_by=created_by,
            name=name,
            kind=kind,
        )

    def get_document_template(self, region_id: str, template_id: str) -> dict:
        return self._document_templates.get_template(region_id, template_id)

    def delete_document_template(self, region_id: str, template_id: str) -> dict:
        return self._document_templates.delete_template(region_id, template_id)

    def read_document_template_bytes(self, region_id: str, template_id: str) -> bytes:
        """업로드한 양식의 원본 HWPX bytes — 계획/평가 렌더 베이스로 사용."""
        return self._document_templates.read_template_bytes(region_id, template_id)

    def export_document_template(
        self,
        region_id: str,
        template_id: str,
        frontend_json: dict,
    ) -> tuple[bytes, str]:
        return self._document_templates.export_filled(
            region_id, template_id, frontend_json
        )

    # --- chat ---

    def get_chat_config(self, region_id: str) -> dict:
        return self._chat_config.get(region_id)

    def save_chat_config(self, region_id: str, body: dict) -> dict:
        return self._chat_config.save(region_id, body)
