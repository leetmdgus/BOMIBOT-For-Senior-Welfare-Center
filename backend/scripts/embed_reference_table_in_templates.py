"""ex_대목차+본문.hwpx 참고 표 → ex_사업계획서(2).hwpx / ex_사업평가 2.hwpx 내장."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.common.hwpx.reference_table_template import (
    HEADING_BODY_FILENAME,
    merge_heading_body_into_hwpx,
)
from app.common.hwpx.render.template_registry import (
    default_template_filename,
    hwpx_templates_dir,
)

TARGETS = (
    default_template_filename("plan"),
    default_template_filename("evaluation"),
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=f"{HEADING_BODY_FILENAME} 참고 표를 plan/evaluation 템플릿에 내장"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="기존 2열 참고 표·PrvText tail을 ex_대목차+본문.hwpx 와 1:1 교체",
    )
    args = parser.parse_args()

    templates = hwpx_templates_dir()
    for target_name in TARGETS:
        target = templates / target_name
        if not target.is_file():
            raise FileNotFoundError(target)
        raw = target.read_bytes()
        merged = merge_heading_body_into_hwpx(
            raw,
            replace_reference=args.force,
            merge_prv=True,
        )
        if merged != raw:
            target.write_bytes(merged)
            print(f"OK {target_name} <- {HEADING_BODY_FILENAME}")
        else:
            print(f"SKIP {target_name}")


if __name__ == "__main__":
    main()
