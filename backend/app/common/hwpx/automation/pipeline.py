from __future__ import annotations

from pathlib import Path
from typing import Any
import json
import shutil
import zipfile
import xml.etree.ElementTree as ET


# ============================================================
# 공통 유틸
# ============================================================

def local_tag(tag: str) -> str:
    """
    XML 네임스페이스가 포함된 태그에서 local name만 반환.

    예:
        "{namespace}p" -> "p"
        "hp:p"         -> "p"
    """
    if not tag:
        return ""
    return tag.rsplit("}", 1)[-1].split(":", 1)[-1]


def to_int(value: Any, default: int | None = None) -> int | None:
    """문자열 숫자를 int로 변환. 실패하면 default 반환."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def walk(
    node: dict[str, Any] | None,
    tag: str | None = None,
) -> list[dict[str, Any]]:
    """
    XML dict tree 전체 재귀 순회.

    tag가 None이면 전체 노드를 반환하고,
    tag가 있으면 local_tag 기준으로 해당 태그만 반환한다.
    """
    if not isinstance(node, dict):
        return []

    result: list[dict[str, Any]] = []

    if tag is None or local_tag(node.get("tag", "")) == tag:
        result.append(node)

    for child in node.get("children") or []:
        result.extend(walk(child, tag))

    return result


def children(
    node: dict[str, Any],
    tag: str | None = None,
) -> list[dict[str, Any]]:
    """
    바로 아래 자식 노드만 반환.

    walk()는 전체 재귀 순회이고,
    children()은 direct children만 본다.
    """
    result = []

    for child in node.get("children") or []:
        if tag is None or local_tag(child.get("tag", "")) == tag:
            result.append(child)

    return result


def first_child(
    node: dict[str, Any],
    tag: str,
) -> dict[str, Any] | None:
    """바로 아래 자식 중 첫 번째 tag 노드 반환."""
    for child in node.get("children") or []:
        if local_tag(child.get("tag", "")) == tag:
            return child

    return None


def get_text_from_run(run_node: dict[str, Any]) -> str:
    """
    HWPX run 노드에서 텍스트 추출.

    대응:
        t         -> 일반 텍스트
        lineBreak -> 줄바꿈
        tab       -> 탭

    주의:
        tbl, pic, shape 같은 객체는 텍스트가 아니다.
        해당 객체들은 make_render_json()의 parse_paragraph_node()에서 별도로 처리한다.
    """
    parts: list[str] = []

    for child in run_node.get("children") or []:
        tag = local_tag(child.get("tag", ""))

        if tag == "t":
            parts.append(child.get("text", ""))
        elif tag == "lineBreak":
            parts.append("\n")
        elif tag == "tab":
            parts.append("\t")

    return "".join(parts)


def parse_linesegarray(node: dict[str, Any]) -> dict[str, Any]:
    """
    HWPX linesegarray를 렌더링용 layout 정보로 변환.

    lineseg는 문단 내 줄의 위치/높이/베이스라인 정보를 가진다.
    프론트에서 absolute 렌더링을 할 때 사용할 수 있다.
    """
    linesegs = []

    for lineseg in children(node, "lineseg"):
        a = lineseg.get("attrs") or {}

        linesegs.append({
            "textpos": to_int(a.get("textpos")),
            "vertpos": to_int(a.get("vertpos")),
            "vertsize": to_int(a.get("vertsize")),
            "textheight": to_int(a.get("textheight")),
            "baseline": to_int(a.get("baseline")),
            "spacing": to_int(a.get("spacing")),
            "horzpos": to_int(a.get("horzpos")),
            "horzsize": to_int(a.get("horzsize")),
            "flags": to_int(a.get("flags")),
            "raw_attrs": a,
        })

    return {"linesegs": linesegs}


# ============================================================
# 1. HWPX -> XML
# ============================================================

def extract_hwpx(
    hwpx_path: str | Path,
    output_dir: str | Path,
) -> Path:
    """
    HWPX 파일을 XML 디렉터리로 압축 해제.

    HWPX는 zip 기반 파일이므로 zipfile로 풀 수 있다.
    """
    hwpx_path = Path(hwpx_path)
    output_dir = Path(output_dir)

    if not hwpx_path.exists():
        raise FileNotFoundError(f"HWPX 파일이 없습니다: {hwpx_path}")

    if output_dir.exists():
        shutil.rmtree(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(hwpx_path, "r") as zip_file:
        zip_file.extractall(output_dir)

    return output_dir


# ============================================================
# 2. XML -> 원본 JSON
# ============================================================

def hwpx_xml_to_json(
    xml_dir: str | Path,
    save_path: str | Path,
) -> dict[str, Any]:
    """
    HWPX XML 디렉터리에서 주요 XML을 원본 보존 JSON으로 변환.

    현재 대상:
        - Contents/section0.xml
        - Contents/header.xml
        - settings.xml

    이 단계의 목적:
        XML 구조를 최대한 그대로 dict로 보존한다.
    """
    xml_dir = Path(xml_dir)
    save_path = Path(save_path)

    if not xml_dir.exists():
        raise FileNotFoundError(f"경로에 폴더가 없습니다: {xml_dir}")

    targets = {
        "section": xml_dir / "Contents" / "section0.xml",
        "header": xml_dir / "Contents" / "header.xml",
        "settings": xml_dir / "settings.xml",
    }

    def xml_to_dict(elem: ET.Element) -> dict[str, Any]:
        return {
            "tag": elem.tag,
            "attrs": dict(elem.attrib),
            "text": elem.text or "",
            "tail": elem.tail or "",
            "children": [xml_to_dict(child) for child in elem],
        }

    result: dict[str, Any] = {}

    for key, path in targets.items():
        if not path.exists():
            raise FileNotFoundError(f"필수 XML이 없습니다: {path}")

        tree = ET.parse(path)
        root = tree.getroot()

        result[key] = {
            "source_path": str(path),
            "root_tag": root.tag,
            "data": xml_to_dict(root),
        }

    save_path.parent.mkdir(parents=True, exist_ok=True)

    with save_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return result


# ============================================================
# 3. 원본 JSON -> Render JSON
# ============================================================

def make_render_json(
    file_json_path: str | Path,
    save_path: str | Path,
) -> dict[str, Any]:
    """
    원본 XML JSON을 렌더링용 중간 JSON으로 변환.

    이 단계에서 하는 일:
        1. header.xml에서 스타일 맵 추출
           - fonts
           - char_styles
           - para_styles
           - border_fills
           - page_defs

        2. section0.xml에서 문서 본문 추출
           - paragraph
           - text_run
           - table(raw_node)
           - image(raw_node)
           - shape(raw_node)

    중요:
        HWPX에서는 표(tbl), 이미지(pic), 도형(shape)이
        p 바로 아래가 아니라 run 내부에 들어가는 경우가 많다.

        따라서 parse_paragraph_node()에서
        p.children뿐 아니라 run.children까지 검사한다.
    """
    file_json_path = Path(file_json_path)
    save_path = Path(save_path)

    with file_json_path.open("r", encoding="utf-8") as f:
        file_json = json.load(f)

    try:
        header_root = file_json["header"]["data"]
        section_root = file_json["section"]["data"]
        settings_root = file_json["settings"]["data"]
    except KeyError as e:
        raise KeyError(f"필수 키가 없습니다: {e}") from e

    # --------------------------------------------------------
    # header.xml: font map
    # --------------------------------------------------------

    font_map: dict[str, str] = {}

    for font in walk(header_root, "font"):
        attrs = font.get("attrs") or {}
        font_id = attrs.get("id")
        face = attrs.get("face")

        if font_id is not None and face:
            font_map[str(font_id)] = face

    # --------------------------------------------------------
    # header.xml: charPr map
    # --------------------------------------------------------

    char_style_map: dict[str, dict[str, Any]] = {}

    for char_pr in walk(header_root, "charPr"):
        attrs = char_pr.get("attrs") or {}
        char_id = attrs.get("id")

        if char_id is None:
            continue

        font_ref = first_child(char_pr, "fontRef")
        font_id = font_ref.get("attrs", {}).get("hangul") if font_ref else None

        italic_node = first_child(char_pr, "italic")
        bold_node = first_child(char_pr, "bold")
        underline_node = first_child(char_pr, "underline")
        strikeout_node = first_child(char_pr, "strikeout")

        height = to_int(attrs.get("height"))

        char_style_map[str(char_id)] = {
            "id": char_id,
            "font_id": font_id,
            "font": font_map.get(str(font_id)) if font_id is not None else None,
            "height": height,
            "size_px_guess": height / 100 if height is not None else None,
            "textColor": attrs.get("textColor"),
            "shadeColor": attrs.get("shadeColor"),
            "bold": bold_node is not None,
            "italic": italic_node is not None,
            "underline": underline_node.get("attrs", {}) if underline_node else None,
            "strikeout": strikeout_node.get("attrs", {}) if strikeout_node else None,
            "raw_attrs": attrs,
        }

    # --------------------------------------------------------
    # header.xml: paraPr map
    # --------------------------------------------------------

    para_style_map: dict[str, dict[str, Any]] = {}

    for para_pr in walk(header_root, "paraPr"):
        attrs = para_pr.get("attrs") or {}
        para_id = attrs.get("id")

        if para_id is None:
            continue

        align = None
        heading = None
        line_spacing = None
        margin = None

        for child in para_pr.get("children") or []:
            tag = local_tag(child.get("tag", ""))
            cattrs = child.get("attrs") or {}

            if tag == "align":
                align = cattrs
            elif tag == "heading":
                heading = cattrs
            elif tag == "lineSpacing":
                line_spacing = cattrs
            elif tag == "margin":
                margin = cattrs

        para_style_map[str(para_id)] = {
            "id": para_id,
            "align": align,
            "heading": heading,
            "lineSpacing": line_spacing,
            "margin": margin,
            "raw_attrs": attrs,
        }

    # --------------------------------------------------------
    # header.xml: borderFill map
    # --------------------------------------------------------

    border_fill_map: dict[str, dict[str, Any]] = {}

    for border_fill in walk(header_root, "borderFill"):
        attrs = border_fill.get("attrs") or {}
        border_id = attrs.get("id")

        if border_id is None:
            continue

        border_fill_map[str(border_id)] = {
            "id": border_id,
            "raw_attrs": attrs,
            "raw_node": border_fill,
        }

    # --------------------------------------------------------
    # header.xml: pageDef
    # --------------------------------------------------------

    page_defs: list[dict[str, Any]] = []

    for page_def in walk(header_root, "pageDef"):
        attrs = page_def.get("attrs") or {}
        page_margin = first_child(page_def, "pageMargin")

        page_defs.append({
            "id": attrs.get("id"),
            "width": to_int(attrs.get("width")),
            "height": to_int(attrs.get("height")),
            "landscape": attrs.get("landscape"),
            "margin": page_margin.get("attrs", {}) if page_margin else None,
            "raw_attrs": attrs,
        })

    # --------------------------------------------------------
    # section0.xml: paragraph 파싱
    # --------------------------------------------------------

    def parse_paragraph_node(
        p_node: dict[str, Any],
        index: int | None = None,
    ) -> dict[str, Any]:
        """
        HWPX p 노드를 render paragraph로 변환.

        처리 대상:
            p
            ├─ run
            │  ├─ t / lineBreak / tab  -> text_run
            │  ├─ tbl                  -> table
            │  ├─ pic                  -> image
            │  └─ shapeObject 등       -> shape
            ├─ tbl                     -> table
            ├─ pic                     -> image
            ├─ shapeObject 등          -> shape
            └─ linesegarray            -> layout

        핵심:
            실제 HWPX에서는 tbl/pic/shape가 p 바로 아래가 아니라
            run 내부에 들어가는 경우가 많다.
        """
        p_attrs = p_node.get("attrs") or {}
        para_id = p_attrs.get("paraPrIDRef")

        runs: list[dict[str, Any]] = []
        layout = None

        def append_object_node(
            obj_node: dict[str, Any],
            run_index: int,
        ) -> None:
            """
            tbl / pic / shape 계열 노드를 runs에 추가.
            p 바로 아래 객체와 run 내부 객체를 같은 방식으로 처리한다.
            """
            obj_tag = local_tag(obj_node.get("tag", ""))

            if obj_tag == "tbl":
                runs.append({
                    "type": "table",
                    "run_index": run_index,
                    "raw_attrs": obj_node.get("attrs") or {},
                    "raw_node": obj_node,
                })

            elif obj_tag == "pic":
                runs.append({
                    "type": "image",
                    "run_index": run_index,
                    "raw_attrs": obj_node.get("attrs") or {},
                    "raw_node": obj_node,
                })

            elif obj_tag in {"shapeObject", "shapeObj", "rect", "ellipse", "line"}:
                runs.append({
                    "type": "shape",
                    "shape_tag": obj_tag,
                    "run_index": run_index,
                    "raw_attrs": obj_node.get("attrs") or {},
                    "raw_node": obj_node,
                })

        for run_index, child in enumerate(p_node.get("children") or []):
            child_tag = local_tag(child.get("tag", ""))

            if child_tag == "run":
                run_attrs = child.get("attrs") or {}
                char_id = run_attrs.get("charPrIDRef")
                text = get_text_from_run(child)

                # 텍스트가 있는 run만 text_run으로 추가.
                # 텍스트가 없는 run을 넣으면 프론트에서 빈 span이 많이 생긴다.
                if text:
                    runs.append({
                        "type": "text_run",
                        "run_index": run_index,
                        "text": text,
                        "charPrIDRef": char_id,
                        "style": char_style_map.get(str(char_id)) if char_id is not None else None,
                        "raw_attrs": run_attrs,
                        "raw_node": child,
                    })

                # 중요:
                # HWPX에서는 tbl/pic/shape가 run 내부에 들어가는 경우가 많다.
                for inner in child.get("children") or []:
                    inner_tag = local_tag(inner.get("tag", ""))

                    if inner_tag in {
                        "tbl",
                        "pic",
                        "shapeObject",
                        "shapeObj",
                        "rect",
                        "ellipse",
                        "line",
                    }:
                        append_object_node(
                            obj_node=inner,
                            run_index=run_index,
                        )

            elif child_tag in {
                "tbl",
                "pic",
                "shapeObject",
                "shapeObj",
                "rect",
                "ellipse",
                "line",
            }:
                # p 바로 아래에 객체가 오는 경우도 대비.
                append_object_node(
                    obj_node=child,
                    run_index=run_index,
                )

            elif child_tag == "linesegarray":
                layout = parse_linesegarray(child)

        return {
            "type": "paragraph",
            "index": index,
            "paraPrIDRef": para_id,
            "styleIDRef": p_attrs.get("styleIDRef"),
            "paragraph_style": para_style_map.get(str(para_id)) if para_id is not None else None,
            "runs": runs,
            "text": "".join(
                run.get("text", "")
                for run in runs
                if run.get("type") == "text_run"
            ),
            "layout": layout,
            "raw_attrs": p_attrs,
            "raw_node": p_node,
        }

    paragraphs: list[dict[str, Any]] = []

    # 주의:
    # walk(section_root, "p")는 표 안의 p까지 모두 포함한다.
    # 따라서 프론트 JSON에는 표 안 문단이 중복 paragraph로 잡힐 수 있다.
    # 우선 구조 확인과 렌더링 실험 목적에서는 전체 p 수집을 유지한다.
    #
    # 나중에 표 내부 p 중복 렌더링이 문제되면
    # section 최상위 p만 추출하도록 별도 필터링을 추가해야 한다.
    
    def collect_top_level_paragraphs(
        node: dict[str, Any],
        inside_table: bool = False,
    ) -> list[dict[str, Any]]:
        """
        section0.xml에서 최상위 문단만 수집.

        기존 walk(section_root, "p")는 표 셀 내부 p까지 전부 가져와서
        표 안의 글자가 표 밖에 중복 렌더링되는 문제가 생긴다.

        이 함수는:
            - 표 밖 p는 수집
            - tbl 내부 p는 제외
            - p를 찾으면 그 p 내부로는 더 내려가지 않음
            이유: p 안의 run 아래 tbl 내부 p까지 중복 수집되는 것을 방지
        """
        tag = local_tag(node.get("tag", ""))

        if tag == "tbl":
            inside_table = True

        if tag == "p":
            if not inside_table:
                return [node]

            return []

        result: list[dict[str, Any]] = []

        for child in node.get("children") or []:
            result.extend(
                collect_top_level_paragraphs(
                    child,
                    inside_table=inside_table,
                )
            )

        return result


    top_level_paragraphs = collect_top_level_paragraphs(section_root)

    for p_index, p in enumerate(top_level_paragraphs):
        paragraphs.append(parse_paragraph_node(p, index=p_index))

    result_json = {
        "type": "hwpx_render_json",
        "source": {
            "section": file_json.get("section", {}).get("source_path"),
            "header": file_json.get("header", {}).get("source_path"),
            "settings": file_json.get("settings", {}).get("source_path"),
        },
        "maps": {
            "fonts": font_map,
            "char_styles": char_style_map,
            "para_styles": para_style_map,
            "border_fills": border_fill_map,
            "page_defs": page_defs,
        },
        "document": {
            "paragraphs": paragraphs,
            "settings_raw": settings_root,
        },
    }

    save_path.parent.mkdir(parents=True, exist_ok=True)

    with save_path.open("w", encoding="utf-8") as f:
        json.dump(result_json, f, ensure_ascii=False, indent=2)

    return result_json


# ============================================================
# 4. Render JSON -> Frontend JSON
# ============================================================

def normalize_render_json_for_frontend(
    render_json: dict[str, Any] | str | Path,
    save_path: str | Path | None = None,
) -> dict[str, Any]:
    """
    Render JSON을 프론트엔드 렌더링용 JSON으로 정규화.

    목적:
        프론트엔드가 raw_node.children[...] 같은 XML 구조를
        직접 탐색하지 않도록 만든다.

    주요 변환:
        table(raw_node)
            -> rows / cells / paragraphs 구조

        image(raw_node)
            -> width / height / position / bindata_ref 구조

        shape(raw_node)
            -> width / height / position / raw_node 구조
    """
    if isinstance(render_json, (str, Path)):
        with Path(render_json).open("r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = render_json

    if data is None:
        raise ValueError(
            "render_json이 None입니다. "
            "make_render_json() 마지막에 return result_json이 있는지 확인하세요."
        )

    char_styles = data.get("maps", {}).get("char_styles", {})
    para_styles = data.get("maps", {}).get("para_styles", {})
    border_fills = data.get("maps", {}).get("border_fills", {})

    def parse_paragraph_for_frontend(
        p_node: dict[str, Any],
        index: int | None = None,
    ) -> dict[str, Any]:
        """표 셀 내부 p 같은 raw p 노드를 프론트용 paragraph로 변환."""
        attrs = p_node.get("attrs") or {}
        para_id = attrs.get("paraPrIDRef")

        runs = []
        layout = None

        for run_index, child in enumerate(p_node.get("children") or []):
            tag = local_tag(child.get("tag", ""))

            if tag == "run":
                run_attrs = child.get("attrs") or {}
                char_id = run_attrs.get("charPrIDRef")
                text = get_text_from_run(child)

                if text:
                    runs.append({
                        "type": "text_run",
                        "run_index": run_index,
                        "text": text,
                        "charPrIDRef": char_id,
                        "style": char_styles.get(str(char_id)) if char_id is not None else None,
                        "raw_attrs": run_attrs,
                    })

            elif tag == "linesegarray":
                layout = parse_linesegarray(child)

        return {
            "type": "paragraph",
            "index": index,
            "paraPrIDRef": para_id,
            "styleIDRef": attrs.get("styleIDRef"),
            "paragraph_style": para_styles.get(str(para_id)) if para_id is not None else None,
            "runs": runs,
            "text": "".join(run.get("text", "") for run in runs),
            "layout": layout,
            "raw_attrs": attrs,
        }
    def get_cell_background_color(
        border_fill_id: str | None,
    ) -> str | None:

        if not border_fill_id:
            return None

        border_fill = border_fills.get(str(border_fill_id))

        if not border_fill:
            return None

        raw_node = border_fill.get("raw_node")

        if not isinstance(raw_node, dict):
            return None

        for node in walk(raw_node):
            if local_tag(node.get("tag", "")) == "winBrush":

                attrs = node.get("attrs") or {}

                face_color = (
                    attrs.get("faceColor")
                    or attrs.get("facecolor")
                )

                if (
                    face_color
                    and str(face_color).lower() != "none"
                ):
                    return face_color

        return None
    
    def parse_cell(tc_node: dict[str, Any]) -> dict[str, Any]:
        """HWPX tc 노드를 프론트용 table_cell로 변환."""
        attrs = tc_node.get("attrs") or {}

        cell_addr = first_child(tc_node, "cellAddr")
        cell_span = first_child(tc_node, "cellSpan")
        cell_size = first_child(tc_node, "cellSz")
        cell_margin = first_child(tc_node, "cellMargin")
        sub_list = first_child(tc_node, "subList")

        addr_attrs = cell_addr.get("attrs", {}) if cell_addr else {}
        span_attrs = cell_span.get("attrs", {}) if cell_span else {}
        size_attrs = cell_size.get("attrs", {}) if cell_size else {}
        margin_attrs = cell_margin.get("attrs", {}) if cell_margin else {}

        paragraphs = []

        if sub_list:
            for i, p_node in enumerate(children(sub_list, "p")):
                paragraphs.append(parse_paragraph_for_frontend(p_node, index=i))

        return {
            "type": "table_cell",
            "row": to_int(addr_attrs.get("rowAddr")),
            "col": to_int(addr_attrs.get("colAddr")),
            "row_span": to_int(span_attrs.get("rowSpan"), 1),
            "col_span": to_int(span_attrs.get("colSpan"), 1),
            "width": to_int(size_attrs.get("width")),
            "height": to_int(size_attrs.get("height")),
            "margin": {
                "left": to_int(margin_attrs.get("left"), 0),
                "right": to_int(margin_attrs.get("right"), 0),
                "top": to_int(margin_attrs.get("top"), 0),
                "bottom": to_int(margin_attrs.get("bottom"), 0),
            },
            "vertical_align": (sub_list.get("attrs", {}) or {}).get("vertAlign") if sub_list else None,
            "borderFillIDRef": attrs.get("borderFillIDRef"),
            "paragraphs": paragraphs,
            "text": "\n".join(p.get("text", "") for p in paragraphs),
            "raw_attrs": attrs,
            "borderFillIDRef": attrs.get("borderFillIDRef"),

            "backgroundColor": get_cell_background_color(
                attrs.get("borderFillIDRef")
            ),
        }

    def parse_table(tbl_node: dict[str, Any]) -> dict[str, Any]:
        """HWPX tbl 노드를 프론트용 table 구조로 변환."""
        attrs = tbl_node.get("attrs") or {}

        size_node = first_child(tbl_node, "sz")
        pos_node = first_child(tbl_node, "pos")
        out_margin_node = first_child(tbl_node, "outMargin")
        in_margin_node = first_child(tbl_node, "inMargin")

        size_attrs = size_node.get("attrs", {}) if size_node else {}
        pos_attrs = pos_node.get("attrs", {}) if pos_node else {}
        out_margin_attrs = out_margin_node.get("attrs", {}) if out_margin_node else {}
        in_margin_attrs = in_margin_node.get("attrs", {}) if in_margin_node else {}

        rows = []

        for row_index, tr_node in enumerate(children(tbl_node, "tr")):
            cells = [parse_cell(tc_node) for tc_node in children(tr_node, "tc")]

            rows.append({
                "type": "table_row",
                "row_index": row_index,
                "cells": cells,
            })

        return {
            "type": "table",
            "id": attrs.get("id"),
            "row_count": to_int(attrs.get("rowCnt")),
            "col_count": to_int(attrs.get("colCnt")),
            "width": to_int(size_attrs.get("width")),
            "height": to_int(size_attrs.get("height")),
            "position": {
                "treatAsChar": pos_attrs.get("treatAsChar"),
                "vertRelTo": pos_attrs.get("vertRelTo"),
                "horzRelTo": pos_attrs.get("horzRelTo"),
                "vertAlign": pos_attrs.get("vertAlign"),
                "horzAlign": pos_attrs.get("horzAlign"),
                "vertOffset": to_int(pos_attrs.get("vertOffset"), 0),
                "horzOffset": to_int(pos_attrs.get("horzOffset"), 0),
            },
            "outer_margin": {
                "left": to_int(out_margin_attrs.get("left"), 0),
                "right": to_int(out_margin_attrs.get("right"), 0),
                "top": to_int(out_margin_attrs.get("top"), 0),
                "bottom": to_int(out_margin_attrs.get("bottom"), 0),
            },
            "inner_margin": {
                "left": to_int(in_margin_attrs.get("left"), 0),
                "right": to_int(in_margin_attrs.get("right"), 0),
                "top": to_int(in_margin_attrs.get("top"), 0),
                "bottom": to_int(in_margin_attrs.get("bottom"), 0),
            },
            "borderFillIDRef": attrs.get("borderFillIDRef"),
            "repeat_header": attrs.get("repeatHeader") == "1",
            "rows": rows,
            "raw_attrs": attrs,
        }

    def find_bindata_ref(pic_node: dict[str, Any]) -> str | None:
        """pic 노드 내부에서 BinData 참조값으로 보이는 값을 추출."""
        candidate_keys = {
            "binaryItemIDRef",
            "binItemIDRef",
            "href",
            "idRef",
            "ref",
        }

        for node in walk(pic_node):
            attrs = node.get("attrs") or {}

            for key, value in attrs.items():
                if key in candidate_keys:
                    return value

        return None

    def parse_image(pic_node: dict[str, Any]) -> dict[str, Any]:
        """HWPX pic 노드를 프론트용 image 구조로 변환."""
        attrs = pic_node.get("attrs") or {}

        size_node = first_child(pic_node, "sz")
        pos_node = first_child(pic_node, "pos")

        size_attrs = size_node.get("attrs", {}) if size_node else {}
        pos_attrs = pos_node.get("attrs", {}) if pos_node else {}

        return {
            "type": "image",
            "id": attrs.get("id"),
            "width": to_int(size_attrs.get("width")),
            "height": to_int(size_attrs.get("height")),
            "bindata_ref": find_bindata_ref(pic_node),
            "src": None,
            "position": {
                "treatAsChar": pos_attrs.get("treatAsChar"),
                "vertRelTo": pos_attrs.get("vertRelTo"),
                "horzRelTo": pos_attrs.get("horzRelTo"),
                "vertAlign": pos_attrs.get("vertAlign"),
                "horzAlign": pos_attrs.get("horzAlign"),
                "vertOffset": to_int(pos_attrs.get("vertOffset"), 0),
                "horzOffset": to_int(pos_attrs.get("horzOffset"), 0),
            },
            "raw_attrs": attrs,
            "raw_node": pic_node,
        }

    def parse_shape(shape_node: dict[str, Any]) -> dict[str, Any]:
        """도형 노드를 프론트용 shape 구조로 변환."""
        attrs = shape_node.get("attrs") or {}

        size_node = first_child(shape_node, "sz")
        pos_node = first_child(shape_node, "pos")

        size_attrs = size_node.get("attrs", {}) if size_node else {}
        pos_attrs = pos_node.get("attrs", {}) if pos_node else {}

        return {
            "type": "shape",
            "shape_tag": local_tag(shape_node.get("tag", "")),
            "id": attrs.get("id"),
            "width": to_int(size_attrs.get("width")),
            "height": to_int(size_attrs.get("height")),
            "position": {
                "treatAsChar": pos_attrs.get("treatAsChar"),
                "vertRelTo": pos_attrs.get("vertRelTo"),
                "horzRelTo": pos_attrs.get("horzRelTo"),
                "vertAlign": pos_attrs.get("vertAlign"),
                "horzAlign": pos_attrs.get("horzAlign"),
                "vertOffset": to_int(pos_attrs.get("vertOffset"), 0),
                "horzOffset": to_int(pos_attrs.get("horzOffset"), 0),
            },
            "raw_attrs": attrs,
            "raw_node": shape_node,
        }

    def normalize_run(run: dict[str, Any]) -> dict[str, Any]:
        """run type별로 프론트용 구조로 변환."""
        run_type = run.get("type")
        raw_node = run.get("raw_node")

        if not isinstance(raw_node, dict):
            return run

        raw_tag = local_tag(raw_node.get("tag", ""))

        if run_type == "table" and raw_tag == "tbl":
            return parse_table(raw_node)

        if run_type == "image" and raw_tag == "pic":
            return parse_image(raw_node)

        if run_type == "shape":
            return parse_shape(raw_node)

        return run

    normalized_paragraphs = []

    for p in data.get("document", {}).get("paragraphs", []):
        new_p = dict(p)
        new_p["runs"] = [normalize_run(run) for run in p.get("runs", [])]
        normalized_paragraphs.append(new_p)

    result = {
        **data,
        "type": "hwpx_frontend_render_json",
        "document": {
            **data.get("document", {}),
            "paragraphs": normalized_paragraphs,
        },
    }

    if save_path is not None:
        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)

        with save_path.open("w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

    return result


# ============================================================
# 5. Render JSON -> XML
# ============================================================

def render_json_to_xml(
    json_data: dict[str, Any] | str | Path,
    template_dir: str | Path,
    output_xml: str | Path,
) -> Path:
    """
    Render JSON의 텍스트를 template XML에 반영.

    현재 구현 범위:
        - paragraph 순서 기준
        - run 순서 기준
        - text_run의 text만 반영

    주의:
        table/image/shape의 구조 변경은 아직 반영하지 않는다.
        즉, 현재는 텍스트 치환 중심이다.
    """
    template_dir = Path(template_dir)
    output_xml = Path(output_xml)

    if isinstance(json_data, (str, Path)):
        with Path(json_data).open("r", encoding="utf-8") as f:
            render_json = json.load(f)
    else:
        render_json = json_data

    if not template_dir.exists():
        raise FileNotFoundError(f"template_dir을 찾을 수 없습니다: {template_dir}")

    section_xml = template_dir / "Contents" / "section0.xml"

    if not section_xml.exists():
        raise FileNotFoundError(f"section0.xml을 찾을 수 없습니다: {section_xml}")

    if output_xml.exists():
        shutil.rmtree(output_xml)

    shutil.copytree(template_dir, output_xml)

    target_section_xml = output_xml / "Contents" / "section0.xml"

    tree = ET.parse(target_section_xml)
    root = tree.getroot()

    paragraphs = render_json.get("document", {}).get("paragraphs", [])
    xml_paragraphs = [el for el in root.iter() if local_tag(el.tag) == "p"]

    for p_data, p_el in zip(paragraphs, xml_paragraphs):
        runs_data = [
            run for run in p_data.get("runs", [])
            if run.get("type") == "text_run"
        ]

        xml_runs = [
            child for child in list(p_el)
            if local_tag(child.tag) == "run"
        ]

        for run_data, run_el in zip(runs_data, xml_runs):
            text = run_data.get("text", "")

            t_nodes = [
                child for child in list(run_el)
                if local_tag(child.tag) == "t"
            ]

            if t_nodes:
                t_nodes[0].text = text

                for extra_t in t_nodes[1:]:
                    run_el.remove(extra_t)
            else:
                t_el = ET.SubElement(
                    run_el,
                    "{http://www.hancom.co.kr/hwpml/2011/paragraph}t",
                )
                t_el.text = text

    tree.write(
        target_section_xml,
        encoding="utf-8",
        xml_declaration=True,
        short_empty_elements=True,
    )

    return output_xml


# ============================================================
# 6. XML -> HWPX
# ============================================================

def xml_to_hwpx(
    xml_dir: str | Path,
    output_hwpx: str | Path,
) -> Path:
    """
    XML 디렉터리를 다시 .hwpx 파일로 압축.

    HWPX는 zip 구조이므로 디렉터리 내부 파일을 zip으로 묶는다.
    """
    xml_dir = Path(xml_dir)
    output_hwpx = Path(output_hwpx)

    if not xml_dir.exists():
        raise FileNotFoundError(f"XML 디렉터리를 찾을 수 없습니다: {xml_dir}")

    if not xml_dir.is_dir():
        raise NotADirectoryError(f"xml_dir는 디렉터리여야 합니다: {xml_dir}")

    output_hwpx.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(output_hwpx, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in xml_dir.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(xml_dir).as_posix()
                zf.write(file_path, arcname)

    return output_hwpx


# ============================================================
# 실행 예시
# ============================================================

if __name__ == "__main__":
    # 입력 HWPX 파일
    input_file_path = Path("HWPX 파일") / "ex_사업계획.hwpx"

    # 작업 디렉터리
    output_dir = Path("step_output")

    # 1단계 결과: 압축 해제 XML
    xml_dir = output_dir / "xml"

    # 2단계 결과: 원본 XML JSON
    json_file_path = output_dir / f"{input_file_path.stem}.json"

    # 3단계 결과: 렌더링용 중간 JSON
    render_json_path = output_dir / f"{input_file_path.stem}_render.json"

    # 4단계 결과: 프론트엔드 렌더링용 JSON
    frontend_json_path = output_dir / f"{input_file_path.stem}_frontend.json"

    # 5단계 결과: 수정된 XML 디렉터리
    output_xml = output_dir / "xml_edit"

    # 6단계 결과: 최종 HWPX
    output_hwpx = output_dir / "result.hwpx"

    # 텍스트를 반영할 기준 템플릿 XML.
    # 보통은 방금 압축 해제한 xml_dir을 그대로 사용하면 된다.
    template_dir = xml_dir

    # 1. HWPX -> XML
    extract_hwpx(
        hwpx_path=input_file_path,
        output_dir=xml_dir,
    )

    # 2. XML -> 원본 JSON
    hwpx_xml_to_json(
        xml_dir=xml_dir,
        save_path=json_file_path,
    )

    # 3. 원본 JSON -> Render JSON
    render_json = make_render_json(
        file_json_path=json_file_path,
        save_path=render_json_path,
    )

    # 4. Render JSON -> Frontend JSON
    normalize_render_json_for_frontend(
        render_json=render_json,
        save_path=frontend_json_path,
    )

    # 5. Render JSON -> XML
    render_json_to_xml(
        json_data=render_json,
        template_dir=template_dir,
        output_xml=output_xml,
    )

    # 6. XML -> HWPX
    xml_to_hwpx(
        xml_dir=output_xml,
        output_hwpx=output_hwpx,
    )

    print(f"원본 JSON 저장 완료: {json_file_path}")
    print(f"Render JSON 저장 완료: {render_json_path}")
    print(f"Frontend JSON 저장 완료: {frontend_json_path}")
    print(f"최종 HWPX 저장 완료: {output_hwpx}")

