"""HWPX 바이너리 무결성 검사 — 배포 전 손상 여부 확인."""

from __future__ import annotations

import io
import zipfile

from lxml import etree


def validate_hwpx_bytes(data: bytes) -> None:
    """한컴 HWPX 최소 요건. 실패 시 ValueError."""
    if len(data) < 22 or data[:2] != b"PK":
        raise ValueError("HWPX is not a ZIP archive")

    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        corrupt = zf.testzip()
        if corrupt:
            raise ValueError(f"HWPX ZIP corrupt entry: {corrupt}")

        names = [info.filename.replace("\\", "/") for info in zf.infolist()]
        required = (
            "content.hpf",
            "Contents/header.xml",
            "Contents/section0.xml",
        )
        for path in required:
            if path not in names:
                raise ValueError(f"HWPX: missing {path}")

        for name in names:
            if name.endswith((".xml", ".hpf")):
                etree.fromstring(zf.read(name))
