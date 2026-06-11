"""
HWPX(ZIP) 유틸 — 다운로드 시 재직렬화 금지.

lxml XML 재파싱은 한컴 한글에서 '손상된 파일' 오류를 유발할 수 있어,
미리보기·다운로드는 원본 바이트를 그대로 사용합니다.
"""

from __future__ import annotations


def is_hwpx_filename(filename: str) -> bool:
    return str(filename or "").lower().endswith(".hwpx")
