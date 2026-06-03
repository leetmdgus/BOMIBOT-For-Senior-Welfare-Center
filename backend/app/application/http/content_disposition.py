"""RFC 5987 Content-Disposition — 한글 파일명 다운로드."""

from __future__ import annotations

import re
from urllib.parse import quote

_ASCII_FALLBACK = re.compile(r"[^a-zA-Z0-9._-]+")


def attachment_content_disposition(filename: str) -> str:
    """attachment 헤더 — ASCII fallback + filename* UTF-8."""
    name = (filename or "download").strip() or "download"
    ascii_name = _ASCII_FALLBACK.sub("_", name).strip("._") or "download"
    encoded = quote(name, safe="")
    return (
        f'attachment; filename="{ascii_name}"; '
        f"filename*=UTF-8''{encoded}"
    )
