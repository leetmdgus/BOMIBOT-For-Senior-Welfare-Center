"""Temporary: compare section0 structure."""
import zipfile
from pathlib import Path
from lxml import etree

HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"


def summarize(path: Path, label: str) -> None:
    with zipfile.ZipFile(path) as z:
        root = etree.fromstring(z.read("Contents/section0.xml"))
    direct = [c for c in root if c.tag == f"{{{HP}}}p"]
    print(f"\n=== {label} ({path.name}) direct_p={len(direct)} ===")
    for i, p in enumerate(direct):
        has_tbl = p.find(f".//{{{HP}}}tbl") is not None
        has_sec = p.find(f".//{{{HP}}}secPr") is not None
        para = p.get("paraPrIDRef")
        style = p.get("styleIDRef")
        run = p.find(f".//{{{HP}}}run")
        char = run.get("charPrIDRef") if run is not None else None
        texts = "".join((t.text or "") for t in p.findall(f".//{{{HP}}}t"))[:40]
        tbl_info = ""
        if has_tbl:
            tbl = p.find(f".//{{{HP}}}tbl")
            tbl_info = (
                f" tbl r={tbl.get('rowCnt')} c={tbl.get('colCnt')}"
                f" bf={tbl.get('borderFillIDRef')}"
            )
        print(
            f"  {i:02d} sec={has_sec} tbl={has_tbl} para={para} style={style}"
            f" char={char}{tbl_info} |{texts}|"
        )


base = Path(__file__).resolve().parents[1]
summarize(base / "app/application/hwpx/templates/business_evaluation.hwpx", "template")
summarize(base / "_hwpx_verify_out/ex_template_evaluation.hwpx", "generated")
