"""Compare template vs generated HWPX internals."""
import sys
import zipfile
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.common.hwpx.render.template_registry import load_render_template_bytes
from app.common.hwpx.render.pipeline import build_hwpx_from_file_json, build_file_json_from_template
from app.common.hwpx.render.apply_form import apply_plan_form
from app.common.hwpx.zip_package import pack_hwpx_zip_bytes

OUT = ROOT / "_hwpx_verify_out"
TEMPLATE = load_render_template_bytes("plan")


def entries(path_or_bytes):
    data = path_or_bytes if isinstance(path_or_bytes, bytes) else path_or_bytes.read_bytes()
    with zipfile.ZipFile(__import__("io").BytesIO(data)) as z:
        return {n: z.read(n) for n in sorted(z.namelist()) if not n.endswith("/")}


def md5(b: bytes) -> str:
    return hashlib.md5(b).hexdigest()[:12]


tpl = entries(TEMPLATE)
print("=== template entry sizes ===")
for k, v in tpl.items():
    print(f"  {k}: {len(v)} md5={md5(v)}")

# roundtrip no fill
fj = build_file_json_from_template("plan")
rt = build_hwpx_from_file_json("plan", fj)
rt_e = entries(rt)

# with fill
form = {"projectName": "치환 테스트", "purpose": "목적", "goals": ["목표1"], "period": "2026",
        "target": "대상", "totalCount": "100", "budget": "1000", "budgetCategory": "인건비",
        "manager": "홍길동", "subProjects": []}
filled = apply_plan_form(fj, form, template_kind="plan")
from app.common.hwpx.prv_text import build_plan_prv_text
from app.common.hwpx.render.service import HwpxRenderService
svc = HwpxRenderService()
filled_hwpx, _ = svc.build_plan_hwpx(form_data=form)
fill_e = entries(filled_hwpx)

# repack only
repack = pack_hwpx_zip_bytes(TEMPLATE, {})
repack_e = entries(repack)

print("\n=== section0 comparison ===")
for label, e in [("template", tpl), ("repack", repack_e), ("roundtrip", rt_e), ("filled", fill_e)]:
    s0 = e.get("Contents/section0.xml", b"")
    print(f"{label}: len={len(s0)} md5={md5(s0)} same_as_tpl={s0 == tpl['Contents/section0.xml']}")
    print(f"  decl: {s0[:80]!r}")

print("\n=== PrvText comparison ===")
for label, e in [("template", tpl), ("filled", fill_e)]:
    p = e.get("Preview/PrvText.txt", b"")
    print(f"{label}: len={len(p)} md5={md5(p)}")

print("\n=== zip identical to template ===")
print("repack == template:", repack == TEMPLATE)
print("roundtrip == template:", rt == TEMPLATE)

# count differing entries roundtrip vs template
diffs = []
for k in tpl:
    if rt_e.get(k) != tpl.get(k):
        diffs.append(k)
print("roundtrip differs:", diffs)
for k in diffs:
    print(f"  {k}: tpl={len(tpl[k])} rt={len(rt_e.get(k,b''))}")
