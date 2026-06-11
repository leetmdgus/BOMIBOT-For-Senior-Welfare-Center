"""HWPX 템플릿 병합 CLI — section0·PrvText 조합."""
from __future__ import annotations

import argparse
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
from app.common.hwpx.template_merge import SectionMergeMode, merge_hwpx_files

PRESETS: dict[str, tuple[str, ...]] = {
    "plan": (default_template_filename("plan"), "ex_대목차+본문.hwpx"),
    "evaluation": (default_template_filename("evaluation"), "ex_대목차+본문.hwpx"),
}


def _resolve(path_str: str) -> Path:
    p = Path(path_str)
    if p.is_file():
        return p
    candidate = hwpx_templates_dir() / path_str
    if candidate.is_file():
        return candidate
    raise FileNotFoundError(path_str)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="HWPX 템플릿 병합 — base + addon(s) → section0·PrvText 합성",
        epilog=(
            "예:\n"
            "  py scripts/merge_hwpx_templates.py ex_사업계획.hwpx ex_대목차+본문.hwpx -o out.hwpx\n"
            "  py scripts/merge_hwpx_templates.py --preset plan -o merged_plan.hwpx --replace-reference\n"
            "  py scripts/merge_hwpx_templates.py base.hwpx part1.hwpx part2.hwpx -o merged.hwpx --mode append"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "paths",
        nargs="*",
        help="base.hwpx [addon1.hwpx [addon2.hwpx ...]] (preset 미사용 시)",
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        help="출력 .hwpx 경로",
    )
    parser.add_argument(
        "--preset",
        choices=sorted(PRESETS),
        help="plan / evaluation — 기본 템플릿 + ex_대목차+본문.hwpx",
    )
    parser.add_argument(
        "--mode",
        choices=[m.value for m in SectionMergeMode],
        default=SectionMergeMode.INSERT_REFERENCE.value,
        help="section0 병합 방식 (default: insert_reference)",
    )
    parser.add_argument(
        "--replace-reference",
        action="store_true",
        help="2열 참고 표·PrvText tail 1:1 교체 (mode=replace_reference)",
    )
    parser.add_argument(
        "--no-prv",
        action="store_true",
        help="PrvText 병합 생략",
    )

    args = parser.parse_args()
    templates = hwpx_templates_dir()

    if args.preset:
        names = PRESETS[args.preset]
        base = templates / names[0]
        addons = [templates / n for n in names[1:]]
    elif len(args.paths) >= 2:
        base = _resolve(args.paths[0])
        addons = [_resolve(p) for p in args.paths[1:]]
    else:
        parser.error("base + addon 경로 2개 이상, 또는 --preset 필요")

    for p in [base, *addons]:
        if not p.is_file():
            raise FileNotFoundError(p)

    mode = SectionMergeMode(args.mode)
    if args.replace_reference:
        mode = SectionMergeMode.REPLACE_REFERENCE

    out = Path(args.output)
    if not out.is_absolute():
        out = ROOT / out

    merge_hwpx_files(
        base,
        out,
        *addons,
        section_mode=mode,
        merge_prv=not args.no_prv,
        replace_prv_tail=args.replace_reference,
    )

    print(f"OK merge -> {out}")
    print(f"  base:   {base.name}")
    for a in addons:
        print(f"  addon:  {a.name}")
    print(f"  mode:   {mode.value}")


if __name__ == "__main__":
    main()
