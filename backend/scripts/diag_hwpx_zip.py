"""ZIP 재패킹만으로 한글 열림이 깨지는지 진단."""

from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.common.hwpx.hwpx_templates import load_template_hwpx_bytes
from app.common.hwpx.zip_package import pack_hwpx_zip

OUT = ROOT / "_hwpx_verify_out"


def zip_entries(data: bytes) -> list[tuple]:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        return [
            (
                i.filename,
                i.compress_type,
                i.flag_bits,
                i.file_size,
                i.compress_size,
            )
            for i in z.infolist()
        ]


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for kind in ("plan", "evaluation"):
        tpl = load_template_hwpx_bytes(kind)
        (OUT / f"diag_tpl_{kind}.hwpx").write_bytes(tpl)
        repacked = pack_hwpx_zip({}, template_kind=kind)
        (OUT / f"diag_repack_{kind}.hwpx").write_bytes(repacked)
        with zipfile.ZipFile(io.BytesIO(tpl)) as z:
            s0 = z.read("Contents/section0.xml")
            prv = z.read("Preview/PrvText.txt")
        touch = pack_hwpx_zip(
            {
                "Contents/section0.xml": s0,
                "Preview/PrvText.txt": prv,
            },
            template_kind=kind,
        )
        (OUT / f"diag_touch_{kind}.hwpx").write_bytes(touch)
        print(f"--- {kind} ---")
        print("  template bytes:", len(tpl))
        print("  repack bytes:", len(repacked), "identical:", repacked == tpl)
        print("  touch identical:", touch == tpl)
        te = zip_entries(tpl)
        re = zip_entries(repacked)
        diffs = [
            (a, b)
            for a, b in zip(te, re)
            if a != b
        ]
        print("  entry diffs:", len(diffs))
        for a, b in diffs[:8]:
            print("   ", a[0], "tpl", a[1:], "rep", b[1:])


if __name__ == "__main__":
    main()
