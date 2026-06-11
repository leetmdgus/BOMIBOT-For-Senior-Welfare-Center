import zipfile
from pathlib import Path
from lxml import etree

HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"


def dump_table_cells(hwpx: Path, table_index: int = 0) -> None:
    with zipfile.ZipFile(hwpx) as z:
        root = etree.fromstring(z.read("Contents/section0.xml"))
    direct = [c for c in root if c.tag == f"{{{HP}}}p"]
    tbl_paras = [p for p in direct if p.find(f".//{{{HP}}}tbl") is not None]
    p = tbl_paras[table_index]
    tbl = p.find(f".//{{{HP}}}tbl")
    print(f"\n{hwpx.name} table {table_index}: {tbl.get('rowCnt')}x{tbl.get('colCnt')}")
    for tr_i, tr in enumerate(tbl.findall(f"{{{HP}}}tr")):
        for tc in tr.findall(f"{{{HP}}}tc"):
            addr = tc.find(f"{{{HP}}}cellAddr")
            span = tc.find(f"{{{HP}}}cellSpan")
            ca = addr.get("colAddr") if addr is not None else "?"
            ra = addr.get("rowAddr") if addr is not None else "?"
            cs = span.get("colSpan") if span is not None else "1"
            rs = span.get("rowSpan") if span is not None else "1"
            hdr = tc.get("header")
            texts = "".join((t.text or "") for t in tc.findall(f".//{{{HP}}}t"))
            texts = texts.replace("\n", "\\n")[:50]
            print(f"  ({ra},{ca}) span={rs}x{cs} hdr={hdr} |{texts}|")


base = Path(__file__).resolve().parents[1]
dump_table_cells(base / "app/common/hwpx/templates/business_evaluation.hwpx", 0)
dump_table_cells(base / "app/common/hwpx/templates/business_evaluation.hwpx", 1)
dump_table_cells(base / "app/common/hwpx/templates/business_plan.hwpx", 0)
