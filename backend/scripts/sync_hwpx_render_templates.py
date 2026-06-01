"""HWPX render 번들 동기화 — ex_대목차+본문.hwpx 내장 후 plan/evaluation.hwpx 갱신."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    scripts = ROOT / "scripts"
    for name in ("embed_reference_table_in_templates.py", "sync_reference_table_templates.py"):
        path = scripts / name
        args = [sys.executable, str(path)]
        if name.startswith("embed"):
            args.append("--force")
        print(f">>> {' '.join(args)}")
        subprocess.run(args, cwd=ROOT, check=True)
    print("HWPX render templates ready (ex_대목차+본문.hwpx embedded)")


if __name__ == "__main__":
    main()
