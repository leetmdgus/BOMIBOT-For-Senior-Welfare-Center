"""HWPX 생성 (KS X 6101/OWPML) — 한글 2024 호환 우선.

현재 한글 2024에서 '파일이 손상되었습니다'가 반복되어, ZIP+XML 패키지를
표준에 가까운 최소 구성(`content.hpf` pkg:package)으로 다시 생성합니다.
"""

from __future__ import annotations

import io
import zipfile
from datetime import UTC, datetime
from typing import Iterable

from app.common.hwpx.encoding import escape_xml, hp_text_runs, sanitize_hwpx_text
from app.common.hwpx.models import HwpxDocument, HwpxSection, HwpxTable, HwpxTableCell


def _iso_now() -> str:
    return datetime.now(UTC).isoformat()


def _content_hpf(parts: Iterable[str]) -> bytes:
    parts_xml = "\n".join(
        f'    <pkg:part name="/{escape_xml(path)}" type="{_part_type(path)}"/>'
        for path in parts
        if path and not path.endswith("/")
    )
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<pkg:package xmlns:pkg="http://www.hancom.co.kr/hwpml/2011/package">
  <pkg:parts>
{parts_xml}
  </pkg:parts>
</pkg:package>"""
    return xml.encode("utf-8")


def _part_type(path: str) -> str:
    norm = path.replace("\\", "/")
    if norm.startswith("Contents/header"):
        return "header"
    if norm.startswith("Contents/section"):
        return "section"
    if norm.startswith("Meta/"):
        return "meta"
    if norm.startswith("Settings/"):
        return "settings"
    if norm.startswith("BinData/"):
        return "binary"
    return "part"


def _header_xml(title: str) -> bytes:
    # 최소 header: title + 기본 스타일 id 0(본문), 1(제목)
    xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:header xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head">
  <hh:docInfo>
    <hh:title>{escape_xml(title)}</hh:title>
  </hh:docInfo>
  <hh:styles>
    <hh:style styleId="0" name="본문" type="para"/>
    <hh:style styleId="1" name="제목" type="para" outlineLevel="1"/>
  </hh:styles>
</hh:header>"""
    return xml.encode("utf-8")


def _meta_xml(title: str) -> bytes:
    xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<meta:meta xmlns:meta="http://www.hancom.co.kr/hwpml/2011/meta">
  <meta:title>{escape_xml(title)}</meta:title>
  <meta:creator>BOMIBOT</meta:creator>
  <meta:created>{escape_xml(_iso_now())}</meta:created>
</meta:meta>"""
    return xml.encode("utf-8")


def _settings_xml() -> bytes:
    # Settings는 선택이지만 존재해도 무방. 최소 빈 설정.
    xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:settings xmlns:hs="http://www.hancom.co.kr/hwpml/2011/settings"/>"""
    return xml.encode("utf-8")


def _section0_xml(sections: list[HwpxSection]) -> bytes:
    # 표준 예시에 맞춰 hs:section + hp/ht 네임스페이스 사용
    blocks: list[str] = []

    def add_para(text: str, style_id: str) -> None:
        runs = hp_text_runs("0", text)
        blocks.append(
            f'<hp:p paraId="{len(blocks)+1}" styleIDRef="{style_id}">{runs}</hp:p>'
        )

    def add_table(table: HwpxTable) -> None:
        blocks.append(_table_xml(table))

    for sec in sections:
        if sec.title and sec.title.strip():
            add_para(sec.title, "1")
        for table in sec.tables:
            add_table(table)
        for para in sec.paragraphs:
            t = (para.text or "").strip()
            if t:
                add_para(t, "0")

    if not blocks:
        add_para(" ", "0")

    body = "\n".join(blocks)
    xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:section xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"
            xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"
            xmlns:ht="http://www.hancom.co.kr/hwpml/2011/table">
{body}
</hs:section>"""
    return xml.encode("utf-8")


def _table_xml(table: HwpxTable) -> str:
    # 단순 표: ht:tbl/ht:tr/ht:tc + 내부 hp:p
    def cell_xml(cell: HwpxTableCell) -> str:
        colspan = cell.col_span or 1
        rowspan = cell.row_span or 1
        attrs = ""
        if colspan > 1:
            attrs += f' gridSpan="{colspan}"'
        if rowspan > 1:
            attrs += f' rowSpan="{rowspan}"'
        runs = hp_text_runs("0", cell.text or " ")
        return f"<ht:tc{attrs}><hp:p>{runs}</hp:p></ht:tc>"

    rows_xml = "\n".join(
        "<ht:tr>" + "".join(cell_xml(c) for c in row) + "</ht:tr>"
        for row in table.rows
        if row
    )
    return f"<ht:tbl>{rows_xml}</ht:tbl>"


def build_hwpx_bytes_v2(doc: HwpxDocument) -> bytes:
    """한글 2024 호환을 위해 표준(content.hpf pkg:package) 기반 HWPX ZIP 생성."""
    title = sanitize_hwpx_text(doc.title or "문서").strip() or "문서"

    # parts (실제 파일 목록)
    payloads: dict[str, bytes] = {
        "Contents/header.xml": _header_xml(title),
        "Contents/section0.xml": _section0_xml(doc.sections),
        "Meta/meta.xml": _meta_xml(title),
        "Settings/settings.xml": _settings_xml(),
    }
    payloads["content.hpf"] = _content_hpf(payloads.keys())

    # ZIP: 단순 저장. 한글 2024가 요구하면 이후 플래그/순서 튜닝.
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # content.hpf를 먼저 넣어 진입점을 명확히
        for name in ["content.hpf", *sorted(k for k in payloads.keys() if k != "content.hpf")]:
            info = zipfile.ZipInfo(name)
            info.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(info, payloads[name])
    return buf.getvalue()

