"""Phase 0 스파이크 — 템플릿 기반 자동작성 핵심 가설 검증.

검증 항목:
  ⓐ parse_hwpx_bytes 의 frontendJson 이 표(행/열/병합/텍스트)를 충실 렌더·채움에
     쓸 만큼 담는가  → 구조 통계 출력
  ⓒ export_hwpx_preserving 왕복: 셀 텍스트 변경 → 써넣기 → 재파싱 → 반영 확인
  ★ 핵심: 양식의 '빈 칸'을 채울 수 있는가 (파서가 text 없는 run 을 버리므로 의심)

실행:
  cd backend
  .venv/Scripts/python.exe scripts/spike_template_roundtrip.py
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path

# backend 디렉터리를 import 루트로
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.application.hwpx.automation.service import HwpxAutomationService  # noqa: E402
from app.application.hwpx.automation.section0_writeback import (  # noqa: E402
    export_hwpx_preserving,
)

REPO_ROOT = BACKEND_DIR.parent
SAMPLES = REPO_ROOT / "rhwp" / "samples" / "hwpx"

# 검증할 양식 후보 (.hwpx)
CANDIDATES = [
    SAMPLES / "ref" / "ref_table.hwpx",
    SAMPLES / "form-002.hwpx",
    SAMPLES / "2024년 1분기 해외직접투자 보도자료 ff.hwpx",
]

_service = HwpxAutomationService()


def line(c: str = "-") -> None:
    print(c * 72)


def iter_tables(frontend_json: dict):
    for p in (frontend_json.get("document") or {}).get("paragraphs") or []:
        for run in p.get("runs") or []:
            if run.get("type") == "table":
                yield p, run


def summarize(name: str, frontend_json: dict) -> None:
    paras = (frontend_json.get("document") or {}).get("paragraphs") or []
    tables = [t for _, t in iter_tables(frontend_json)]
    print(f"[구조] {name}")
    print(f"  최상위 문단: {len(paras)}개 / 표: {len(tables)}개")
    for ti, tbl in enumerate(tables):
        rows = tbl.get("rows") or []
        ncell = sum(len(r.get('cells') or []) for r in rows)
        merged = sum(
            1
            for r in rows
            for c in (r.get('cells') or [])
            if (c.get('row_span') or 1) > 1 or (c.get('col_span') or 1) > 1
        )
        empty = sum(
            1
            for r in rows
            for c in (r.get('cells') or [])
            if not (c.get('text') or '').strip()
        )
        print(
            f"  · 표#{ti}: {tbl.get('row_count')}행×{tbl.get('col_count')}열, "
            f"셀 {ncell}개 (병합 {merged}, 빈칸 {empty})"
        )
        # 첫 표의 셀 텍스트 미리보기 (라벨↔값 패턴 확인용)
        if ti == 0:
            for r in rows[:4]:
                texts = [repr((c.get('text') or '')[:14]) for c in (r.get('cells') or [])]
                print("      행:", " | ".join(texts))


def first_nonempty_cell(frontend_json: dict):
    """텍스트가 있는 첫 셀과 그 위치 반환."""
    for _, tbl in iter_tables(frontend_json):
        for r in tbl.get("rows") or []:
            for c in r.get("cells") or []:
                if (c.get("text") or "").strip():
                    return c
    return None


def first_empty_cell(frontend_json: dict):
    for _, tbl in iter_tables(frontend_json):
        for r in tbl.get("rows") or []:
            for c in r.get("cells") or []:
                if not (c.get("text") or "").strip():
                    return c
    return None


def set_cell_first_run_text(cell: dict, new_text: str) -> bool:
    """셀의 첫 text_run 텍스트 교체 (있는 칸 채우기 시뮬레이션)."""
    for p in cell.get("paragraphs") or []:
        for run in p.get("runs") or []:
            if run.get("type") == "text_run":
                run["text"] = new_text
                return True
    return False


def inject_text_into_empty_cell(cell: dict, new_text: str) -> str:
    """빈 칸 채우기 시도. run_index 추정으로 text_run 주입.

    파서가 빈 run 을 버리므로 frontendJson 빈 셀의 paragraphs[].runs 는 비어 있다.
    writeback 은 run_index 로 기존 <run> 을 찾으므로, run_index=0 을 추정 주입한다.
    """
    paras = cell.get("paragraphs") or []
    if not paras:
        # 셀에 문단조차 없으면 주입 경로 없음
        cell["paragraphs"] = [{"type": "paragraph", "runs": []}]
        paras = cell["paragraphs"]
    p = paras[0]
    p.setdefault("runs", [])
    p["runs"].append({"type": "text_run", "run_index": 0, "text": new_text})
    return "run_index=0 추정 주입"


def roundtrip(name: str, hwpx_bytes: bytes) -> None:
    line("=")
    print(f"### {name}")
    parsed = _service.parse_hwpx_bytes(hwpx_bytes, source_filename=name)
    fj = parsed["frontendJson"]
    summarize(name, fj)

    # --- ⓒ-1: 텍스트 있는 셀 변경 왕복 ---
    line()
    fj1 = copy.deepcopy(fj)
    cell = first_nonempty_cell(fj1)
    if cell is not None:
        before = cell.get("text")
        token = "★SPIKE_RELABEL★"
        ok = set_cell_first_run_text(cell, token)
        if ok:
            out = export_hwpx_preserving(hwpx_bytes, fj1)
            changed_bytes = out != hwpx_bytes
            re_fj = _service.parse_hwpx_bytes(out, source_filename=name)["frontendJson"]
            landed = any(
                token in (c.get("text") or "")
                for _, t in iter_tables(re_fj)
                for r in t.get("rows") or []
                for c in r.get("cells") or []
            )
            print(f"[c-1 채워진 칸 변경] before={before!r}")
            print(f"  bytes변경={changed_bytes}  재파싱반영={'PASS' if landed else 'FAIL'}")
        else:
            print("[ⓒ-1] 셀에 text_run 없음 — 변경 스킵")
    else:
        print("[ⓒ-1] 텍스트 있는 셀 없음")

    # --- ★ ⓒ-2: 빈 칸 채우기 (핵심 의문) ---
    line()
    fj2 = copy.deepcopy(fj)
    empty = first_empty_cell(fj2)
    if empty is not None:
        token = "★SPIKE_FILL_EMPTY★"
        how = inject_text_into_empty_cell(empty, token)
        try:
            out = export_hwpx_preserving(hwpx_bytes, fj2)
            re_fj = _service.parse_hwpx_bytes(out, source_filename=name)["frontendJson"]
            landed = any(
                token in (c.get("text") or "")
                for _, t in iter_tables(re_fj)
                for r in t.get("rows") or []
                for c in r.get("cells") or []
            )
            print(f"[* c-2 빈 칸 채우기] 방식={how}")
            print(f"  재파싱반영={'PASS 빈칸 채움 가능' if landed else 'FAIL 빈칸 못 채움 - 갭'}")
        except Exception as exc:  # noqa: BLE001
            print(f"[★ ⓒ-2] 예외: {type(exc).__name__}: {exc}")
    else:
        print("[ⓒ-2] 빈 칸 없음")


def main() -> None:
    for path in CANDIDATES:
        if not path.is_file():
            print(f"(없음) {path}")
            continue
        try:
            roundtrip(path.name, path.read_bytes())
        except Exception as exc:  # noqa: BLE001
            import traceback
            print(f"### {path.name} - 예외 {type(exc).__name__}: {exc}")
            traceback.print_exc()


if __name__ == "__main__":
    # 콘솔이 cp949여도 한글이 깨지지 않도록 UTF-8 파일로 리포트 작성 후 Read로 확인
    report_path = BACKEND_DIR / "scripts" / "spike_out.txt"
    real_stdout = sys.stdout
    with open(report_path, "w", encoding="utf-8") as f:
        sys.stdout = f
        try:
            main()
        finally:
            sys.stdout = real_stdout
    print(f"report written: {report_path}")
