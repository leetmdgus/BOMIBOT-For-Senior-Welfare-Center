import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.common.hwpx.render.file_json_render import make_file_json_from_bytes
from app.common.hwpx.render.json_tree import walk_nodes, local_tag, first_child
from app.common.hwpx.render.template_registry import load_render_template_bytes

fj = make_file_json_from_bytes(load_render_template_bytes("plan"), template_kind="plan")
tbl = walk_nodes(fj["section"]["data"], "tbl")[1]
lines = []
for tr in tbl.get("children") or []:
    if local_tag(str(tr.get("tag", ""))) != "tr":
        continue
    row = []
    for tc in tr.get("children") or []:
        if local_tag(str(tc.get("tag", ""))) != "tc":
            continue
        addr = first_child(tc, "cellAddr")
        a = (addr.get("attrs") or {}) if addr else {}
        texts = [n.get("text", "") for n in walk_nodes(tc) if local_tag(str(n.get("tag", ""))) == "t"]
        row.append((a.get("rowAddr"), a.get("colAddr"), "".join(texts)))
    lines.append(str(row))
(ROOT / "_hwpx_verify_out" / "plan_table1.txt").write_text("\n".join(lines), encoding="utf-8")
print("wrote", len(lines), "rows")
