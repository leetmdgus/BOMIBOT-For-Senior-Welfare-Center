"""ex_사업계획서(2).hwpx / ex_사업평가 2.hwpx → render 번들 동기화 (참고 표 내장)."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.common.hwpx.render.template_registry import (
    default_template_filename,
    hwpx_templates_dir,
)

RENDER_DIR = ROOT / "app" / "application" / "hwpx" / "templates" / "render"

SOURCES = {
    "plan": hwpx_templates_dir() / default_template_filename("plan"),
    "evaluation": hwpx_templates_dir() / default_template_filename("evaluation"),
}


def main() -> None:
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    for kind, src in SOURCES.items():
        if not src.is_file():
            raise FileNotFoundError(src)
        out = RENDER_DIR / f"{kind}.hwpx"
        out.write_bytes(src.read_bytes())
        print(f"OK {kind}: {src.name} -> {out.relative_to(ROOT)}")
    print("render 템플릿 동기화 완료 (참고 표는 HWPX 원본에 포함)")


if __name__ == "__main__":
    main()
