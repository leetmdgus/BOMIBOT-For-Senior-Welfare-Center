"""rhwp CLI 어댑터 — HWP/HWPX 바이트를 페이지별 SVG로 정확 렌더링.

기존 프론트의 손수 만든 DOM 근사 렌더러 대신, Rust 기반 rhwp 렌더러
(`rhwp export-svg`)로 한글 원본과 거의 동일한 레이아웃/폰트/표를 SVG로 뽑는다.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path
from tempfile import TemporaryDirectory

from app.core.config import get_settings


class RhwpNotAvailableError(RuntimeError):
    """rhwp 바이너리를 찾을 수 없거나 실행할 수 없음 (503 처리 대상)."""


class RhwpRenderError(RuntimeError):
    """rhwp 렌더링 실패 (422 처리 대상)."""


_EXE_NAME = "rhwp.exe" if os.name == "nt" else "rhwp"


def _candidate_bin_paths() -> list[Path]:
    """repo 내 빌드 산출물 후보 경로 (release 우선)."""
    here = Path(__file__).resolve()
    rhwp_root: Path | None = None
    for parent in here.parents:
        candidate = parent / "rhwp" / "Cargo.toml"
        if candidate.exists():
            rhwp_root = parent / "rhwp"
            break
    if rhwp_root is None:
        return []
    return [
        rhwp_root / "target" / "release" / _EXE_NAME,
        rhwp_root / "target" / "debug" / _EXE_NAME,
    ]


@lru_cache(maxsize=1)
def resolve_rhwp_bin() -> str:
    """rhwp 실행 파일 경로 결정. 설정(RHWP_BIN) → PATH → repo 빌드 산출물 순."""
    configured = (get_settings().rhwp_bin or "").strip()
    if configured:
        path = Path(configured)
        if path.exists():
            return str(path)
        raise RhwpNotAvailableError(
            f"RHWP_BIN 경로에 실행 파일이 없습니다: {configured}"
        )

    on_path = shutil.which("rhwp")
    if on_path:
        return on_path

    for candidate in _candidate_bin_paths():
        if candidate.exists():
            return str(candidate)

    raise RhwpNotAvailableError(
        "rhwp 바이너리를 찾을 수 없습니다. "
        "`cargo build --release --bin rhwp`로 빌드하거나 RHWP_BIN 설정을 지정하세요."
    )


# 프론트가 보내는 font_mode → export-svg 옵션 매핑
_FONT_MODE_FLAGS: dict[str, list[str]] = {
    "": [],  # native: CSS font-family 체인만 (가장 가벼움, 위치는 정확)
    "style": ["--font-style"],  # @font-face local() 참조 삽입
    "subset": ["--embed-fonts"],  # 사용 글자만 서브셋 임베딩 (오프라인 정확)
    "full": ["--embed-fonts=full"],  # 전체 폰트 임베딩
}


def render_to_svg_pages(
    doc_bytes: bytes,
    *,
    suffix: str = ".hwpx",
    font_mode: str = "",
    timeout: float = 60.0,
) -> list[str]:
    """문서 바이트 → 페이지 순서대로 정렬된 SVG 문자열 목록.

    Args:
        doc_bytes: `.hwp`/`.hwpx` 원본 바이트.
        suffix: 임시 입력 파일 확장자 (rhwp는 매직바이트로도 판별하나 명시).
        font_mode: "", "style", "subset", "full" 중 하나.
        timeout: rhwp 호출 제한 시간(초).
    """
    if not doc_bytes:
        raise RhwpRenderError("빈 문서입니다.")

    bin_path = resolve_rhwp_bin()
    font_flags = _FONT_MODE_FLAGS.get(font_mode, [])

    with TemporaryDirectory(prefix="rhwp_svg_") as tmp:
        tmp_path = Path(tmp)
        in_path = tmp_path / f"input{suffix}"
        in_path.write_bytes(doc_bytes)
        out_dir = tmp_path / "svg"
        out_dir.mkdir()

        cmd = [
            bin_path,
            "export-svg",
            str(in_path),
            "-o",
            str(out_dir),
            *font_flags,
        ]

        try:
            proc = subprocess.run(  # noqa: S603 - 신뢰된 내부 바이너리
                cmd,
                capture_output=True,
                timeout=timeout,
                check=False,
            )
        except FileNotFoundError as exc:  # 바이너리가 사라진 경우
            resolve_rhwp_bin.cache_clear()
            raise RhwpNotAvailableError(f"rhwp 실행 실패: {exc}") from exc
        except subprocess.TimeoutExpired as exc:
            raise RhwpRenderError("rhwp 렌더링 시간이 초과되었습니다.") from exc

        # export-svg: 단일 페이지 "input.svg", 복수 "input_001.svg" ... → 이름 정렬이 곧 페이지 순서
        svg_files = sorted(out_dir.glob("*.svg"))
        if not svg_files:
            stderr = proc.stderr.decode("utf-8", "replace").strip()
            tail = stderr[-800:] if stderr else "(출력 없음)"
            raise RhwpRenderError(f"SVG 생성에 실패했습니다: {tail}")

        return [path.read_text(encoding="utf-8") for path in svg_files]
