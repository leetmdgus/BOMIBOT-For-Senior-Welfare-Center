"""DocumentTemplateService end-to-end 검증 (DB/앱 없이 인메모리 repo).

업로드 → 목록 → 조회(재파싱) → 채움 → 내보내기 왕복 → 삭제 전 과정 확인.

실행:
  cd backend
  .venv/Scripts/python.exe scripts/spike_template_service.py
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.application.region_store.document_templates import DocumentTemplateService  # noqa: E402
from app.application.region_store.gateway import RegionStoreGateway  # noqa: E402
from app.application.services.file_storage_service import FileStorageService  # noqa: E402
from app.application.hwpx.automation.service import HwpxAutomationService  # noqa: E402

REPO_ROOT = BACKEND_DIR.parent
SAMPLE = REPO_ROOT / "rhwp" / "samples" / "hwpx" / "form-002.hwpx"
REGION = "chuncheon-north"


class InMemoryRepo:
    """RegionJsonStoreRepository 계약(get_payload/save_payload)만 충족하는 스텁."""

    def __init__(self) -> None:
        self._data: dict[tuple[str, str], dict] = {}

    def get_payload(self, region_id: str, domain: str):
        return self._data.get((region_id, domain))

    def save_payload(self, region_id: str, domain: str, payload: dict):
        self._data[(region_id, domain)] = payload
        return payload


def first_cell_with_text(frontend_json: dict):
    for p in (frontend_json.get("document") or {}).get("paragraphs") or []:
        for run in p.get("runs") or []:
            if run.get("type") == "table":
                for row in run.get("rows") or []:
                    for cell in row.get("cells") or []:
                        if (cell.get("text") or "").strip():
                            return cell
    return None


def main() -> None:
    out = []

    def log(s: str = "") -> None:
        out.append(s)

    gateway = RegionStoreGateway(InMemoryRepo())
    tmp = tempfile.mkdtemp(prefix="tpl_spike_")
    fs = FileStorageService(base_dir=Path(tmp))
    svc = DocumentTemplateService(gateway, fs)

    content = SAMPLE.read_bytes()

    # 1) 업로드
    meta = svc.create_template(
        REGION, filename=SAMPLE.name, content=content, created_by="테스터"
    )
    log(f"[1 업로드] id={meta['id']} name={meta['name']!r} stats={meta['stats']}")
    assert meta["id"].startswith("tpl-")
    assert meta["stats"]["tableCount"] >= 1

    # 2) 목록
    listed = svc.list_templates(REGION)
    log(f"[2 목록] {len(listed)}개, frontendJson 미포함={'frontendJson' not in listed[0]}")
    assert len(listed) == 1
    assert "frontendJson" not in listed[0]  # 목록은 경량 메타만

    # 3) 조회(재파싱)
    detail = svc.get_template(REGION, meta["id"])
    fj = detail["frontendJson"]
    cell = first_cell_with_text(fj)
    log(f"[3 조회] frontendJson 포함={bool(fj)} 첫 텍스트셀={cell.get('text')[:20]!r}")
    assert fj and cell is not None

    # 4) 채움 시뮬레이션: 첫 텍스트 셀을 토큰으로 변경
    token = "SPIKE_SERVICE_FILL"
    for p_ in cell.get("paragraphs") or []:
        for r_ in p_.get("runs") or []:
            if r_.get("type") == "text_run":
                r_["text"] = token
                break

    # 5) 내보내기 (원본 보존 writeback)
    payload, out_name = svc.export_filled(REGION, meta["id"], fj)
    log(f"[5 내보내기] bytes={len(payload):,} filename={out_name!r} 원본대비변경={payload != content}")
    assert payload != content

    # 6) 내보낸 HWPX 재파싱 → 토큰 반영 확인
    re_fj = HwpxAutomationService().parse_hwpx_bytes(payload, source_filename=out_name)["frontendJson"]
    landed = any(
        token in (c.get("text") or "")
        for p in (re_fj.get("document") or {}).get("paragraphs") or []
        for run in p.get("runs") or []
        if run.get("type") == "table"
        for row in run.get("rows") or []
        for c in row.get("cells") or []
    )
    log(f"[6 왕복검증] 토큰반영={'PASS' if landed else 'FAIL'}")
    assert landed

    # 7) 삭제
    svc.delete_template(REGION, meta["id"])
    after = svc.list_templates(REGION)
    log(f"[7 삭제] 남은 템플릿={len(after)}")
    assert len(after) == 0

    log("")
    log("=== ALL PASS ===")

    report = BACKEND_DIR / "scripts" / "spike_service_out.txt"
    report.write_text("\n".join(out), encoding="utf-8")
    print("OK - report:", report)


if __name__ == "__main__":
    main()
