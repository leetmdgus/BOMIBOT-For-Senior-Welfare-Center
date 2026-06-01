import zipfile
from pathlib import Path
from lxml import etree

HP = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"
root_dir = Path(__file__).resolve().parents[1] / "HWPX_TEMPLATES"

for path in sorted(root_dir.glob("ex_사업*.hwpx")):
    with zipfile.ZipFile(path) as zf:
        doc = etree.fromstring(zf.read("Contents/section0.xml"))
    tbls = doc.findall(f".//{HP}tbl")
    print("\n===", path.name, "tables", len(tbls), "===")
    for i, tbl in enumerate(tbls):
        rc, cc = int(tbl.get("rowCnt") or 0), int(tbl.get("colCnt") or 0)
        print(f" tbl[{i}] {rc}x{cc}")
        # sample col0 labels rows 0-2
        for row in range(min(3, rc)):
            for tc in tbl.findall(f".//{HP}tr")[row].findall(f".//{HP}tc") if row < len(tbl.findall(f'.//{HP}tr')) else []:
                pass
        trs = tbl.findall(f".//{HP}tr")
        for ri in range(min(5, len(trs))):
            tcs = trs[ri].findall(f".//{HP}tc")
            labels = []
            for tc in tcs[:2]:
                ts = tc.findall(f".//{HP}t")
                labels.append((ts[0].text or "").strip()[:20] if ts else "")
            print(f"  row{ri}:", labels)
