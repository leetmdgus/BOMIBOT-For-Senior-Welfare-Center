"""Region-scoped binary file storage on local disk."""

from __future__ import annotations

import mimetypes
import re
from pathlib import Path

from fastapi import HTTPException, status

from app.common.core.config import get_settings

_SAFE_SEGMENT = re.compile(r"[^a-zA-Z0-9._-]+")


class FileStorageService:
    def __init__(self, base_dir: Path | None = None) -> None:
        settings = get_settings()
        root = base_dir or Path(settings.files_storage_dir)
        self._base = root.resolve()
        self._base.mkdir(parents=True, exist_ok=True)

    def _region_dir(self, region_id: str) -> Path:
        safe_region = _SAFE_SEGMENT.sub("_", region_id).strip("_") or "default"
        path = self._base / safe_region
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def _safe_extension(filename: str) -> str:
        suffix = Path(filename).suffix.lower()
        if suffix and len(suffix) <= 12 and re.match(r"^\.[a-z0-9]+$", suffix):
            return suffix
        return ".bin"

    def write(
        self,
        region_id: str,
        file_id: str,
        filename: str,
        data: bytes,
    ) -> tuple[str, str]:
        ext = self._safe_extension(filename)
        storage_key = f"{file_id}{ext}"
        dest = self._region_dir(region_id) / storage_key
        dest.write_bytes(data)
        mime_type, _ = mimetypes.guess_type(filename)
        return storage_key, mime_type or "application/octet-stream"

    def exists(self, region_id: str, storage_key: str | None) -> bool:
        if not storage_key:
            return False
        if ".." in storage_key or "/" in storage_key or "\\" in storage_key:
            return False
        return (self._region_dir(region_id) / storage_key).is_file()

    def resolve_path(self, region_id: str, storage_key: str) -> Path:
        if not storage_key or ".." in storage_key or "/" in storage_key or "\\" in storage_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid storage key",
            )
        path = self._region_dir(region_id) / storage_key
        if not path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    "파일 본문을 찾을 수 없습니다. "
                    "서버 저장소가 초기화되었을 수 있습니다. 파일을 다시 업로드해 주세요."
                ),
            )
        return path

    def delete(self, region_id: str, storage_key: str | None) -> None:
        if not storage_key:
            return
        try:
            path = self.resolve_path(region_id, storage_key)
            path.unlink(missing_ok=True)
        except HTTPException:
            pass

    @staticmethod
    def format_size(num_bytes: int) -> str:
        if num_bytes >= 1024 * 1024:
            return f"{num_bytes / (1024 * 1024):.2f} MB"
        if num_bytes >= 1024:
            return f"{num_bytes / 1024:.1f} KB"
        return f"{num_bytes} B"
