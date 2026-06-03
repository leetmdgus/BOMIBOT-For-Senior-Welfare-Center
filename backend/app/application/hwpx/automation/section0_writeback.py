"""편집된 frontend JSON을 원본 HWPX에 '절대 보존'으로 반영.

핵심 원칙:
    - 원본 HWPX의 모든 ZIP 항목(mimetype·header.xml·settings.xml·BinData·Preview 등)은
      바이트 그대로 보존하고, Contents/section0.xml 만 교체한다.
    - section0.xml 편집은 lxml로 수행해 hp:/hh: 네임스페이스 프리픽스를 보존한다.
      (ElementTree는 ns0:/ns1:로 바꿔 한글이 열 때 형식이 깨진다.)
    - 변경된 텍스트가 없으면 원본 바이트를 그대로 반환한다(완전 동일).
    - 텍스트를 바꾼 경우에만 무효화된 hp:linesegarray(줄 레이아웃 캐시)를 제거해
      한글 2024 변조 경고/레이아웃 깨짐을 막는다(한글이 재계산).

Phase 1 범위: 최상위 문단의 text_run 텍스트 반영(원본 파서 collect_top_level_paragraphs와
동일한 순서/대상). 표 셀 텍스트·서식(글꼴·크기·bold·셀색)·이미지는 Phase 2에서 확장한다.
"""

from __future__ import annotations

import copy
import io
import zipfile
from typing import Any

from lxml import etree

from app.application.hwpx.encoding import sanitize_hwpx_text
from app.application.hwpx.html_images import HtmlImageSegment, parse_image_data_url
from app.application.hwpx.hwpx_image_embed import (
    HwpxImageCatalog,
    build_pic_element,
    patch_content_hpf,
    patch_header_bindata,
    seed_pic_ids,
)
from app.application.hwpx.section0_template_fill import HP_NS
from app.application.hwpx.zip_package import pack_hwpx_zip_bytes

_HP = f"{{{HP_NS}}}"
_HH_NS = "http://www.hancom.co.kr/hwpml/2011/head"
_HC_NS = "http://www.hancom.co.kr/hwpml/2011/core"
_HH = f"{{{_HH_NS}}}"
_HC = f"{{{_HC_NS}}}"
_SECTION0_PATH = "Contents/section0.xml"
_HEADER_PATH = "Contents/header.xml"
_CONTENT_HPF_PATH = "Contents/content.hpf"
_TEXT_CHILD_TAGS = {"t", "lineBreak", "tab"}


class HeaderEditor:
    """header.xml의 charPr/borderFill을 '추가만' 하며 기존 항목은 절대 변경하지 않음.

    - 글자색/크기 변경 → 기존 charPr를 복제해 height/textColor만 바꾼 새 charPr 추가,
      run의 charPrIDRef를 새 id로 교체.
    - 셀 배경색 변경 → 기존 borderFill을 복제해 hc:fillBrush/winBrush faceColor를 바꾼
      새 borderFill 추가, tc의 borderFillIDRef를 새 id로 교체.
    같은 (base, 목표) 조합은 캐시해 중복 생성하지 않는다. 변경이 있으면 changed=True.
    """

    def __init__(self, root: etree._Element) -> None:
        self.root = root
        self.changed = False
        self._char_container = root.find(f".//{_HH}charProperties")
        self._bf_container = root.find(f".//{_HH}borderFills")
        self._char_by_id = self._index(self._char_container, f"{_HH}charPr")
        self._bf_by_id = self._index(self._bf_container, f"{_HH}borderFill")
        self._fontfaces = root.findall(f".//{_HH}fontface")
        self._char_cache: dict[tuple, str] = {}
        self._bf_cache: dict[tuple, str] = {}
        self._font_cache: dict[str, str] = {}

    _FONT_LANGS = ("hangul", "latin", "hanja", "japanese", "other", "symbol", "user")

    def _hangul_fontface(self) -> etree._Element | None:
        for ff in self._fontfaces:
            if ff.get("lang") == "HANGUL":
                return ff
        return self._fontfaces[0] if self._fontfaces else None

    def resolve_font(self, face: str) -> str | None:
        """글꼴 face → font id. 이미 있으면 재사용, 없으면 모든 lang 목록에 동일 id로 추가."""
        if not face:
            return None
        if face in self._font_cache:
            return self._font_cache[face]
        hangul = self._hangul_fontface()
        if hangul is None:
            return None
        for font in hangul.findall(f"{_HH}font"):
            if font.get("face") == face and font.get("id") is not None:
                self._font_cache[face] = font.get("id")
                return font.get("id")
        # 신규 face — 모든 fontface 목록에 동일 id로 추가 (lang별 동기화)
        max_id = -1
        for ff in self._fontfaces:
            for font in ff.findall(f"{_HH}font"):
                try:
                    max_id = max(max_id, int(font.get("id") or "-1"))
                except ValueError:
                    continue
        new_id = str(max_id + 1)
        for ff in self._fontfaces:
            fonts = ff.findall(f"{_HH}font")
            if not fonts:
                continue
            clone = copy.deepcopy(fonts[0])
            clone.set("id", new_id)
            clone.set("face", face)
            ff.append(clone)
            ff.set("fontCnt", str(len(ff.findall(f"{_HH}font"))))
        self._font_cache[face] = new_id
        self.changed = True
        return new_id

    @staticmethod
    def _index(container: etree._Element | None, tag: str) -> dict[str, etree._Element]:
        result: dict[str, etree._Element] = {}
        if container is None:
            return result
        for el in container.findall(tag):
            el_id = el.get("id")
            if el_id is not None:
                result[el_id] = el
        return result

    @staticmethod
    def _next_id(by_id: dict[str, etree._Element]) -> str:
        nums = [int(k) for k in by_id if k.isdigit()]
        return str(max(nums) + 1) if nums else "0"

    @staticmethod
    def _set_flag(charpr: etree._Element, flag: str, value: bool, anchors: list[str]) -> None:
        """charPr 자식 bold/italic 토글. HWPML 순서(…offset, italic, bold, underline…) 유지."""
        existing = charpr.find(f"{_HH}{flag}")
        if value and existing is None:
            el = etree.Element(f"{_HH}{flag}")
            anchor = None
            for name in anchors:
                anchor = charpr.find(f"{_HH}{name}")
                if anchor is not None:
                    break
            if anchor is not None:
                anchor.addprevious(el)
            else:
                charpr.append(el)
        elif not value and existing is not None:
            charpr.remove(existing)

    def resolve_char_pr(
        self,
        base_id: str,
        *,
        height: int | None = None,
        text_color: str | None = None,
        bold: bool | None = None,
        italic: bool | None = None,
        font_id: str | None = None,
    ) -> str | None:
        base = self._char_by_id.get(str(base_id))
        if base is None:
            return None
        cur_h = base.get("height")
        cur_c = base.get("textColor")
        cur_bold = base.find(f"{_HH}bold") is not None
        cur_italic = base.find(f"{_HH}italic") is not None
        cur_font_ref = base.find(f"{_HH}fontRef")
        cur_font = cur_font_ref.get("hangul") if cur_font_ref is not None else None
        tgt_h = str(height) if height is not None else cur_h
        tgt_c = text_color if text_color is not None else cur_c
        tgt_bold = cur_bold if bold is None else bold
        tgt_italic = cur_italic if italic is None else italic
        tgt_font = str(font_id) if font_id is not None else cur_font
        if (
            tgt_h == cur_h
            and tgt_c == cur_c
            and tgt_bold == cur_bold
            and tgt_italic == cur_italic
            and tgt_font == cur_font
        ):
            return str(base_id)  # 변경 없음
        sig = (str(base_id), tgt_h, tgt_c, tgt_bold, tgt_italic, tgt_font)
        if sig in self._char_cache:
            return self._char_cache[sig]
        clone = copy.deepcopy(base)
        new_id = self._next_id(self._char_by_id)
        clone.set("id", new_id)
        if tgt_h is not None:
            clone.set("height", tgt_h)
        if tgt_c is not None:
            clone.set("textColor", tgt_c)
        if font_id is not None:
            clone_font_ref = clone.find(f"{_HH}fontRef")
            if clone_font_ref is not None:
                for lang in self._FONT_LANGS:
                    clone_font_ref.set(lang, str(font_id))
        # bold를 underline 앞에, italic을 bold 앞에 배치
        self._set_flag(clone, "bold", tgt_bold, ["underline", "strikeout"])
        self._set_flag(clone, "italic", tgt_italic, ["bold", "underline", "strikeout"])
        self._char_container.append(clone)
        self._char_by_id[new_id] = clone
        self._char_container.set("itemCnt", str(len(self._char_by_id)))
        self._char_cache[sig] = new_id
        self.changed = True
        return new_id

    def resolve_border_fill(self, base_id: str, face_color: str) -> str | None:
        base = self._bf_by_id.get(str(base_id))
        if base is None:
            return None
        cur_wb = base.find(f".//{_HC}winBrush")
        cur_color = cur_wb.get("faceColor") if cur_wb is not None else None
        if (cur_color or "none") == (face_color or "none"):
            return str(base_id)  # 변경 없음
        key = (str(base_id), face_color)
        if key in self._bf_cache:
            return self._bf_cache[key]
        clone = copy.deepcopy(base)
        new_id = self._next_id(self._bf_by_id)
        clone.set("id", new_id)
        fill = clone.find(f"{_HC}fillBrush")
        if fill is None:
            fill = etree.SubElement(clone, f"{_HC}fillBrush")  # diagonal 뒤 = 스키마 순서
        win = fill.find(f"{_HC}winBrush")
        if win is None:
            win = etree.SubElement(fill, f"{_HC}winBrush")
            win.set("hatchColor", "#000000")
            win.set("alpha", "0")
        win.set("faceColor", face_color)
        self._bf_container.append(clone)
        self._bf_by_id[new_id] = clone
        self._bf_container.set("itemCnt", str(len(self._bf_by_id)))
        self._bf_cache[key] = new_id
        self.changed = True
        return new_id


def _localname(el: etree._Element) -> str:
    tag = el.tag
    if not isinstance(tag, str):
        return ""
    return tag.rsplit("}", 1)[-1]


def _top_level_paragraphs(root: etree._Element) -> list[etree._Element]:
    """표 셀 내부 p를 제외한 section0 최상위 hp:p 목록.

    backend automation pipeline의 collect_top_level_paragraphs와 동일한 수집 규칙이라
    frontend JSON의 document.paragraphs 순서와 1:1로 맞는다.
    """
    result: list[etree._Element] = []

    def walk(node: etree._Element, inside_table: bool) -> None:
        tag = _localname(node)
        if tag == "tbl":
            inside_table = True
        if tag == "p":
            if not inside_table:
                result.append(node)
            return  # p 내부로는 더 내려가지 않음(표 내부 중복 방지)
        for child in node:
            walk(child, inside_table)

    walk(root, False)
    return result


def _run_text(run_el: etree._Element) -> str:
    """hp:run의 현재 텍스트(파서 get_text_from_run과 동일 규칙)."""
    parts: list[str] = []
    for child in run_el:
        tag = _localname(child)
        if tag == "t":
            parts.append(child.text or "")
        elif tag == "lineBreak":
            parts.append("\n")
        elif tag == "tab":
            parts.append("\t")
    return "".join(parts)


def _set_run_text(run_el: etree._Element, text: str) -> None:
    """hp:run의 텍스트 노드(t/lineBreak/tab)를 새 텍스트로 재구성.

    줄바꿈(\\n)은 hp:lineBreak, 탭(\\t)은 hp:tab으로 변환해 한글 구조를 유지한다.
    charPr 등 비텍스트 자식은 건드리지 않아 글꼴·서식 참조가 보존된다.
    """
    safe = sanitize_hwpx_text(text)

    # 기존 텍스트 노드 위치 기억 후 제거
    insert_at = len(run_el)
    first_text_idx: int | None = None
    for idx, child in enumerate(list(run_el)):
        if _localname(child) in _TEXT_CHILD_TAGS:
            if first_text_idx is None:
                first_text_idx = idx
    if first_text_idx is not None:
        insert_at = first_text_idx
    for child in list(run_el):
        if _localname(child) in _TEXT_CHILD_TAGS:
            run_el.remove(child)

    # 새 노드 구성 (run_el 트리에 insert하면 조상 nsmap에서 hp: 프리픽스를 상속)
    new_nodes: list[etree._Element] = []
    for line_index, line in enumerate(safe.split("\n")):
        if line_index > 0:
            new_nodes.append(etree.Element(f"{_HP}lineBreak"))
        for seg_index, segment in enumerate(line.split("\t")):
            if seg_index > 0:
                new_nodes.append(etree.Element(f"{_HP}tab"))
            t_el = etree.Element(f"{_HP}t")
            t_el.text = segment
            new_nodes.append(t_el)

    for offset, node in enumerate(new_nodes):
        run_el.insert(insert_at + offset, node)


def _apply_run_style(
    run_el: etree._Element,
    style: Any,
    hed: HeaderEditor | None,
) -> bool:
    """run.style(크기·글자색)를 charPr로 반영 — 원본과 다르면 새 charPr id로 교체."""
    if hed is None or not isinstance(style, dict):
        return False
    base_id = run_el.get("charPrIDRef")
    if base_id is None:
        return False
    height: int | None = None
    size_guess = style.get("size_px_guess")
    raw_height = style.get("height")
    if isinstance(size_guess, (int, float)):
        height = round(float(size_guess) * 100)
    elif isinstance(raw_height, (int, float)):
        height = int(raw_height)
    color = style.get("textColor")
    text_color = color if isinstance(color, str) and color and color != "none" else None
    bold = style.get("bold") if isinstance(style.get("bold"), bool) else None
    italic = style.get("italic") if isinstance(style.get("italic"), bool) else None
    face = style.get("font")
    font_id = hed.resolve_font(face) if isinstance(face, str) and face.strip() else None
    new_id = hed.resolve_char_pr(
        base_id,
        height=height,
        text_color=text_color,
        bold=bold,
        italic=italic,
        font_id=font_id,
    )
    if new_id is not None and new_id != base_id:
        run_el.set("charPrIDRef", new_id)
        return True
    return False


def _apply_runs_to_paragraph(
    p_el: etree._Element,
    runs_data: list[dict[str, Any]],
    hed: HeaderEditor | None,
) -> bool:
    """문단 한 개의 text_run 텍스트·서식을 hp:p에 반영 (run_index 기준). 변경 여부 반환."""
    xml_children = list(p_el)
    changed = False
    for run in runs_data or []:
        if run.get("type") != "text_run":
            continue
        run_index = run.get("run_index")
        if not isinstance(run_index, int) or run_index < 0 or run_index >= len(xml_children):
            continue
        run_el = xml_children[run_index]
        if _localname(run_el) != "run":
            continue
        new_text = run.get("text", "")
        if _run_text(run_el) != new_text:
            _set_run_text(run_el, new_text)
            changed = True
        if _apply_run_style(run_el, run.get("style"), hed):
            changed = True
    return changed


def _direct_tables(p_el: etree._Element) -> list[etree._Element]:
    """문단의 최상위 표(다른 표 안에 중첩되지 않은 hp:tbl)를 문서 순서대로."""
    tables: list[etree._Element] = []

    def walk(node: etree._Element, inside_table: bool) -> None:
        for child in node:
            if _localname(child) == "tbl":
                if not inside_table:
                    tables.append(child)
                walk(child, True)
            else:
                walk(child, inside_table)

    walk(p_el, False)
    return tables


def _cells_by_addr(tbl_el: etree._Element) -> dict[tuple[int, int], etree._Element]:
    """표의 직접 셀을 (rowAddr, colAddr)로 매핑 (중첩 표 셀 제외)."""
    result: dict[tuple[int, int], etree._Element] = {}
    for tr in tbl_el.findall(f"{_HP}tr"):
        for tc in tr.findall(f"{_HP}tc"):
            addr = tc.find(f"{_HP}cellAddr")
            if addr is None:
                continue
            row = addr.get("rowAddr")
            col = addr.get("colAddr")
            if row is None or col is None:
                continue
            try:
                result[(int(row), int(col))] = tc
            except ValueError:
                continue
    return result


def _apply_cell_text(
    tc_el: etree._Element,
    cell_data: dict[str, Any],
    hed: HeaderEditor | None,
) -> bool:
    """표 셀(tc)의 subList 문단 텍스트·서식을 반영. 변경 여부 반환."""
    sub = tc_el.find(f"{_HP}subList")
    if sub is None:
        return False
    xml_ps = sub.findall(f"{_HP}p")
    changed = False
    for p_data, p_el in zip(cell_data.get("paragraphs", []) or [], xml_ps):
        if _apply_runs_to_paragraph(p_el, p_data.get("runs", []), hed):
            changed = True
    return changed


def _apply_cell_background(
    tc_el: etree._Element,
    cell_data: dict[str, Any],
    hed: HeaderEditor | None,
) -> bool:
    """셀 배경색을 borderFill로 반영 — 원본과 다르면 새 borderFill id로 교체."""
    color = cell_data.get("backgroundColor")
    if hed is None or not isinstance(color, str) or not color:
        return False
    base = tc_el.get("borderFillIDRef")
    if base is None:
        return False
    new_id = hed.resolve_border_fill(base, color)
    if new_id is not None and new_id != base:
        tc_el.set("borderFillIDRef", new_id)
        return True
    return False


def _apply_existing_paragraph(
    p_el: etree._Element,
    p_data: dict[str, Any],
    hed: HeaderEditor | None,
) -> bool:
    """기존 hp:p에 텍스트/서식 + 표 셀(텍스트/서식/배경) 편집 반영."""
    changed = _apply_runs_to_paragraph(p_el, p_data.get("runs", []), hed)

    fe_tables = [r for r in (p_data.get("runs") or []) if r.get("type") == "table"]
    if fe_tables:
        xml_tables = _direct_tables(p_el)
        for fe_tbl, xml_tbl in zip(fe_tables, xml_tables):
            addr_map = _cells_by_addr(xml_tbl)
            for row in fe_tbl.get("rows", []) or []:
                for cell in row.get("cells", []) or []:
                    tc = addr_map.get((cell.get("row"), cell.get("col")))
                    if tc is None:
                        continue
                    if _apply_cell_text(tc, cell, hed):
                        changed = True
                    if _apply_cell_background(tc, cell, hed):
                        changed = True
    return changed


def _is_new_paragraph(p_data: dict[str, Any]) -> bool:
    """프론트에서 새로 추가한 문단(이미지/표 isNew 포함)인지."""
    return any(
        isinstance(r, dict) and r.get("isNew")
        for r in (p_data.get("runs") or [])
    )


def _build_image_paragraph(
    p_data: dict[str, Any],
    catalog: HwpxImageCatalog,
    p_id: int,
) -> etree._Element | None:
    """isNew 이미지 run을 가진 문단을 hp:p(+hp:pic)로 생성. BinData는 catalog에 등록."""
    image_run = next(
        (
            r
            for r in (p_data.get("runs") or [])
            if isinstance(r, dict) and r.get("type") == "image" and r.get("isNew")
        ),
        None,
    )
    if image_run is None:
        return None
    data_url = image_run.get("dataUrl") or image_run.get("src")
    if not isinstance(data_url, str):
        return None
    parsed = parse_image_data_url(data_url)
    if parsed is None:
        return None
    data, ext = parsed
    item_id = catalog.add(HtmlImageSegment(data=data, ext=ext))
    image = catalog.get(item_id)
    if image is None:
        return None

    p_el = etree.Element(
        f"{_HP}p",
        {
            "id": str(p_id),
            "paraPrIDRef": "0",
            "styleIDRef": "0",
            "pageBreak": "0",
            "columnBreak": "0",
            "merged": "0",
        },
    )
    run_el = etree.SubElement(p_el, f"{_HP}run", {"charPrIDRef": "0"})
    build_pic_element(run_el, image)
    return p_el


def _max_attr_int(root: etree._Element, attr: str) -> int:
    """문서 전체에서 해당 속성의 최대 정수값(없으면 -1) — 신규 id 충돌 방지."""
    mx = -1
    for el in root.iter():
        v = el.get(attr)
        if v is None:
            continue
        try:
            mx = max(mx, int(v))
        except (TypeError, ValueError):
            continue
    return mx


def _apply_edits(
    root: etree._Element,
    frontend_json: dict[str, Any],
    hed: HeaderEditor | None,
    catalog: HwpxImageCatalog,
    new_p_id_base: int,
) -> bool:
    """frontend JSON을 section0 root에 반영. 기존 문단은 편집, isNew 이미지 문단은 삽입."""
    json_paragraphs = (frontend_json.get("document") or {}).get("paragraphs") or []
    xml_paragraphs = _top_level_paragraphs(root)
    parent = xml_paragraphs[0].getparent() if xml_paragraphs else None

    changed = False
    xi = 0
    last_p: etree._Element | None = None
    new_p_id = new_p_id_base

    for p_data in json_paragraphs:
        if _is_new_paragraph(p_data):
            new_p = _build_image_paragraph(p_data, catalog, new_p_id)
            new_p_id += 1
            if new_p is not None:
                if last_p is not None:
                    last_p.addnext(new_p)
                elif xml_paragraphs:
                    xml_paragraphs[0].addprevious(new_p)
                elif parent is not None:
                    parent.append(new_p)
                last_p = new_p
                changed = True
            # 신규 표(isNew table)는 아직 미지원 → 건너뜀(기존 문단 정렬은 유지)
            continue

        if xi < len(xml_paragraphs):
            p_el = xml_paragraphs[xi]
            xi += 1
            last_p = p_el
            if _apply_existing_paragraph(p_el, p_data, hed):
                changed = True

    return changed


def _original_xml_decl(section0: bytes) -> bytes:
    """원본 section0의 XML 선언을 그대로 보존."""
    stripped = section0.lstrip()
    if stripped.startswith(b"<?xml"):
        end = section0.find(b"?>")
        if end != -1:
            return section0[: end + 2]
    return b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'


def _strip_linesegarray(root: etree._Element) -> None:
    for lineseg in list(root.iter(f"{_HP}linesegarray")):
        parent = lineseg.getparent()
        if parent is not None:
            parent.remove(lineseg)


def export_hwpx_preserving(hwpx_bytes: bytes, frontend_json: dict[str, Any]) -> bytes:
    """원본 HWPX에 편집 텍스트를 반영하되, section0.xml 외의 모든 항목은 바이트 보존.

    변경이 없으면 원본 바이트를 그대로 반환한다.
    """
    if not hwpx_bytes:
        raise ValueError("원본 HWPX 파일이 필요합니다.")
    if not frontend_json:
        raise ValueError("frontendJson이 비어 있습니다.")

    with zipfile.ZipFile(io.BytesIO(hwpx_bytes)) as zf:
        names = set(zf.namelist())
        if _SECTION0_PATH not in names:
            raise ValueError(f"{_SECTION0_PATH}를 찾을 수 없습니다.")
        section0 = zf.read(_SECTION0_PATH)
        header = zf.read(_HEADER_PATH) if _HEADER_PATH in names else None
        content_hpf = zf.read(_CONTENT_HPF_PATH) if _CONTENT_HPF_PATH in names else None

    catalog = HwpxImageCatalog()
    root = etree.fromstring(section0)
    # 업로드 문서의 기존 id/instid 위로 신규 id를 배정(충돌 방지). pic id는 큰 간격을 둠.
    id_base = max(_max_attr_int(root, "id"), _max_attr_int(root, "instid")) + 1
    seed_pic_ids(id_base + 1_000_000)
    header_editor = HeaderEditor(etree.fromstring(header)) if header is not None else None
    changed = _apply_edits(root, frontend_json, header_editor, catalog, id_base)
    header_changed = header_editor is not None and header_editor.changed
    has_images = catalog.has_images

    if not changed and not header_changed and not has_images:
        return hwpx_bytes  # 완전 동일(절대 보존)

    _strip_linesegarray(root)
    body = etree.tostring(root, encoding="utf-8", xml_declaration=False, pretty_print=False)
    file_contents = {_SECTION0_PATH: _original_xml_decl(section0) + body}
    allow_paths: set[str] = set()
    extra_files: dict[str, bytes] = {}

    # header.xml — charPr/borderFill(서식) + binDataList(이미지). 둘 중 하나라도 있으면 교체.
    if (header_changed or has_images) and header is not None:
        if header_changed:
            header_bytes = _original_xml_decl(header) + etree.tostring(
                header_editor.root, encoding="utf-8", xml_declaration=False, pretty_print=False
            )
        else:
            header_bytes = header
        if has_images:
            header_bytes = patch_header_bindata(header_bytes, catalog)
        if header_bytes != header:
            file_contents[_HEADER_PATH] = header_bytes
            allow_paths.add(_HEADER_PATH)

    # content.hpf manifest + BinData ZIP 항목(이미지)
    if has_images:
        if content_hpf is not None:
            patched_hpf = patch_content_hpf(content_hpf, catalog)
            if patched_hpf != content_hpf:
                file_contents[_CONTENT_HPF_PATH] = patched_hpf
                allow_paths.add(_CONTENT_HPF_PATH)
        extra_files = catalog.bin_files()

    return pack_hwpx_zip_bytes(
        hwpx_bytes,
        file_contents,
        extra_files=extra_files,
        allow_template_paths=allow_paths,
    )
