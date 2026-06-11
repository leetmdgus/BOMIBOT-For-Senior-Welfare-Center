"""HWPX 템플릿 병합 — section0.xml·PrvText.txt 조합."""

from __future__ import annotations

import copy
import io
import zipfile
from enum import Enum
from pathlib import Path
from typing import BinaryIO

from lxml import etree

from app.common.hwpx.zip_package import pack_hwpx_zip_bytes

HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HP = f"{{{HP_NS}}}"


class SectionMergeMode(str, Enum):
    """section0 병합 방식."""

    APPEND = "append"
    """addon section0 자식(hp:p)을 base 끝에 이어붙임 (빈 tail p 제외)."""
    INSERT_REFERENCE = "insert_reference"
    """addon 2열 참고 표 — base에 없으면 첫 표 뒤 삽입, 있으면 유지."""
    REPLACE_REFERENCE = "replace_reference"
    """base 2열 참고 표를 addon 것으로 1:1 교체 (없으면 삽입)."""


def _serialize_section0(root: etree._Element) -> bytes:
    return etree.tostring(
        root,
        encoding="UTF-8",
        xml_declaration=True,
        standalone=True,
    )


def _section0_root(hwpx: bytes) -> etree._Element:
    with zipfile.ZipFile(io.BytesIO(hwpx)) as zf:
        return etree.fromstring(zf.read("Contents/section0.xml"))


def _prv_bytes(hwpx: bytes) -> bytes:
    with zipfile.ZipFile(io.BytesIO(hwpx)) as zf:
        return zf.read("Preview/PrvText.txt")


def _find_table_paragraph(root: etree._Element, *, col_cnt: int | None = None) -> etree._Element | None:
    for para in root.findall(f"{HP}p"):
        for tbl in para.findall(f".//{HP}tbl"):
            cc = int(tbl.get("colCnt") or 0)
            if col_cnt is None or cc == col_cnt:
                return para
    return None


def _find_reference_paragraph(root: etree._Element) -> etree._Element | None:
    return _find_table_paragraph(root, col_cnt=2)


def _is_empty_tail_paragraph(para: etree._Element) -> bool:
    tbl = para.find(f".//{HP}tbl")
    if tbl is not None:
        return False
    texts = [t.text or "" for t in para.findall(f".//{HP}t")]
    return not any(text.strip() for text in texts)


def _appendable_children(root: etree._Element) -> list[etree._Element]:
    children = list(root)
    if children and _is_empty_tail_paragraph(children[-1]):
        return children[:-1]
    return children


def _prv_tail_start(lines: list[str]) -> int | None:
    for idx, line in enumerate(lines):
        if "<대목차><" in line:
            return idx
    return None


def merge_prv_text(
    base_prv: bytes,
    addon_prv: bytes,
    *,
    replace_tail: bool = False,
) -> bytes:
    """PrvText — addon 의 대목차 tail을 base에 병합."""
    sep = b"\r\n" if b"\r\n" in base_prv else b"\n"
    tgt_lines = base_prv.split(sep)
    src_lines = addon_prv.split(sep)
    src_start = _prv_tail_start([ln.decode("utf-8", "replace") for ln in src_lines])
    if src_start is None:
        return base_prv

    tail = src_lines[src_start:]
    tgt_start = _prv_tail_start([ln.decode("utf-8", "replace") for ln in tgt_lines])
    if tgt_start is not None and replace_tail:
        tgt_lines = tgt_lines[:tgt_start]
    elif tgt_start is not None:
        return base_prv

    merged = sep.join(tgt_lines + tail)
    if len(merged) < len(base_prv):
        merged += b" " * (len(base_prv) - len(merged))
    return merged


def merge_section0_xml(
    base_section0: bytes,
    addon_section0: bytes,
    *,
    mode: SectionMergeMode = SectionMergeMode.INSERT_REFERENCE,
) -> bytes:
    """section0.xml — base + addon 병합."""
    base_root = etree.fromstring(base_section0)
    addon_root = etree.fromstring(addon_section0)

    if mode == SectionMergeMode.APPEND:
        for child in _appendable_children(addon_root):
            base_root.append(copy.deepcopy(child))
        return _serialize_section0(base_root)

    addon_ref = _find_reference_paragraph(addon_root)
    if addon_ref is None:
        for child in _appendable_children(addon_root):
            base_root.append(copy.deepcopy(child))
        return _serialize_section0(base_root)

    base_ref = _find_reference_paragraph(base_root)
    proto = copy.deepcopy(addon_ref)

    if mode == SectionMergeMode.REPLACE_REFERENCE:
        if base_ref is None:
            insert_at = 1
            for idx, child in enumerate(base_root):
                if child.find(f".//{HP}tbl") is not None:
                    insert_at = idx + 1
                    break
            base_root.insert(insert_at, proto)
        else:
            parent = base_ref.getparent()
            if parent is None:
                raise ValueError("참고 표 문단 parent 없음")
            idx = list(parent).index(base_ref)
            parent.remove(base_ref)
            parent.insert(idx, proto)
        return _serialize_section0(base_root)

    # INSERT_REFERENCE — base에 2열 표 없을 때만 삽입
    if base_ref is None:
        insert_at = 1
        for idx, child in enumerate(base_root):
            if child.find(f".//{HP}tbl") is not None:
                insert_at = idx + 1
                break
        base_root.insert(insert_at, proto)
    return _serialize_section0(base_root)


def merge_hwpx_bytes(
    base: bytes,
    *addons: bytes,
    section_mode: SectionMergeMode = SectionMergeMode.INSERT_REFERENCE,
    merge_prv: bool = True,
    replace_prv_tail: bool = False,
) -> bytes:
    """
    HWPX ZIP 병합 — base 골격 유지, section0·PrvText만 addon 반영.

    addons 는 순서대로 base에 누적 병합됩니다.
    """
    with zipfile.ZipFile(io.BytesIO(base)) as zf:
        section0_out_bytes = zf.read("Contents/section0.xml")
        prv_out = zf.read("Preview/PrvText.txt")

    for addon in addons:
        with zipfile.ZipFile(io.BytesIO(addon)) as zf:
            addon_s0 = zf.read("Contents/section0.xml")
            addon_prv = zf.read("Preview/PrvText.txt")
        section0_out_bytes = merge_section0_xml(
            section0_out_bytes,
            addon_s0,
            mode=section_mode,
        )
        if merge_prv:
            prv_out = merge_prv_text(
                prv_out,
                addon_prv,
                replace_tail=replace_prv_tail,
            )

    return pack_hwpx_zip_bytes(
        base,
        {
            "Contents/section0.xml": section0_out_bytes,
            "Preview/PrvText.txt": prv_out,
        },
    )


def merge_hwpx_files(
    base_path: Path | str,
    out_path: Path | str,
    *addon_paths: Path | str,
    section_mode: SectionMergeMode = SectionMergeMode.INSERT_REFERENCE,
    merge_prv: bool = True,
    replace_prv_tail: bool = False,
) -> Path:
    """파일 경로 기준 HWPX 병합 → out_path 저장."""
    base_b = Path(base_path).read_bytes()
    addons_b = [Path(p).read_bytes() for p in addon_paths]
    merged = merge_hwpx_bytes(
        base_b,
        *addons_b,
        section_mode=section_mode,
        merge_prv=merge_prv,
        replace_prv_tail=replace_prv_tail,
    )
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(merged)
    return out


def load_hwpx_bytes(source: Path | str | bytes | BinaryIO) -> bytes:
    if isinstance(source, bytes):
        return source
    if isinstance(source, (str, Path)):
        return Path(source).read_bytes()
    return source.read()
