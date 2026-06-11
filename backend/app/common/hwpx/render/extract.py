"""노트북 step1 — extract_hwpx."""

from __future__ import annotations

from pathlib import Path
from zipfile import ZipFile


def extract_hwpx(hwpx_path: str | Path, output_dir: str | Path) -> Path:
    """한글 HWPX 압축 해제 (step1_빈파일분석.ipynb)."""
    hwpx_path = Path(hwpx_path)
    output_dir = Path(output_dir)

    if not hwpx_path.is_file():
        raise FileNotFoundError(f"hwpx file not found: {hwpx_path}")

    output_dir.mkdir(parents=True, exist_ok=True)

    with ZipFile(hwpx_path, "r") as zip_file:
        zip_file.extractall(output_dir)

    return output_dir
