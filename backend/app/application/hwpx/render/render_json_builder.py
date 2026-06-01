"""
step3_rendering_hwpx.ipynb — make_render_json (+ step4 표 확장).

노트북 흐름:
  file_json → make_render_json → render_json_to_html (html_preview.py)
"""

from __future__ import annotations

import copy
from typing import Any

from app.application.hwpx.render.json_tree import first_child, local_tag, walk_nodes

RENDER_JSON_TYPE = "hwpx_render_json"


def _to_int(value: Any, default: int | None = None) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _get_text_from_run(run: dict[str, Any]) -> str:
    texts: list[str] = []
    for child in run.get("children", []):
        if local_tag(str(child.get("tag", ""))) == "t":
            texts.append(str(child.get("text", "")))
    return "".join(texts)


def _get_outside_table_text_from_run(run: dict[str, Any]) -> str:
    """run 직계 hp:t — hp:tbl 앞뒤 제목 등 (표 subtree 제외)."""
    texts: list[str] = []
    for child in run.get("children", []):
        ctag = local_tag(str(child.get("tag", "")))
        if ctag == "t":
            texts.append(str(child.get("text", "")))
    return "".join(texts).strip()


def _get_leading_text_from_run(run: dict[str, Any]) -> str:
    """하위 호환 — tbl 앞 텍스트만."""
    texts: list[str] = []
    for child in run.get("children", []):
        ctag = local_tag(str(child.get("tag", "")))
        if ctag == "tbl":
            break
        if ctag == "t":
            texts.append(str(child.get("text", "")))
    return "".join(texts).strip()


def _iter_body_paragraph_nodes(section_root: dict[str, Any]):
    """section hp:p — 중첩 hp:p(추가본문·대목차 표)까지 문서 순서로 yield."""
    for p in section_root.get("children", []):
        if local_tag(str(p.get("tag", ""))) != "p":
            continue
        nested = [
            c
            for c in p.get("children", [])
            if local_tag(str(c.get("tag", ""))) == "p"
        ]
        if nested:
            for child in nested:
                yield from _iter_body_paragraph_nodes({"children": [child]})
        else:
            yield p


def _strip_tags_for_table(node: dict[str, Any]) -> dict[str, Any]:
    return {
        "tag": local_tag(str(node.get("tag", ""))),
        "attrs": dict(node.get("attrs", {})),
        "text": node.get("text", ""),
        "children": [_strip_tags_for_table(c) for c in node.get("children", [])],
    }


def _child_attrs(node: dict[str, Any], tag: str) -> dict[str, Any]:
    child = first_child(node, tag)
    return dict(child.get("attrs", {})) if child else {}


def _resolve_para_char_refs(
    p_attrs: dict[str, Any],
    *,
    style_map: dict[str, Any],
) -> tuple[str | None, str | None]:
    para_id = p_attrs.get("paraPrIDRef")
    char_id = p_attrs.get("charPrIDRef")
    style_id = p_attrs.get("styleIDRef")
    if style_id is not None:
        style = style_map.get(str(style_id)) or {}
        if para_id is None:
            para_id = style.get("paraPrIDRef")
        if char_id is None:
            char_id = style.get("charPrIDRef")
    return para_id, char_id


def _parse_text_runs(
    p_node: dict[str, Any],
    char_style_map: dict[str, Any],
    *,
    style_map: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    p_attrs = p_node.get("attrs", {})
    _, default_char_id = _resolve_para_char_refs(p_attrs, style_map=style_map or {})
    parsed: list[dict[str, Any]] = []
    for run_node in p_node.get("children", []):
        if local_tag(str(run_node.get("tag", ""))) != "run":
            continue
        if first_child(run_node, "tbl"):
            continue
        run_attrs = run_node.get("attrs", {})
        char_id = run_attrs.get("charPrIDRef") or default_char_id
        text = _get_text_from_run(run_node)
        if text:
            parsed.append(
                {
                    "type": "text_run",
                    "text": text,
                    "charPrIDRef": char_id,
                    "style": char_style_map.get(str(char_id)),
                    "raw_attrs": run_attrs,
                }
            )
    return parsed


def _parse_table(
    tbl_node: dict[str, Any],
    para_style_map: dict[str, Any],
    char_style_map: dict[str, Any],
    *,
    style_map: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """step4 — 표 run (사업계획서·평가서 미리보기)."""
    table: dict[str, Any] = {
        "type": "table",
        "raw_attrs": tbl_node.get("attrs", {}),
        "raw_node": copy.deepcopy(tbl_node),
        "rows": [],
    }
    for tr_node in tbl_node.get("children", []):
        if local_tag(str(tr_node.get("tag", ""))) != "tr":
            continue
        row: dict[str, Any] = {
            "type": "table_row",
            "raw_attrs": tr_node.get("attrs", {}),
            "cells": [],
        }
        for tc_node in tr_node.get("children", []):
            if local_tag(str(tc_node.get("tag", ""))) != "tc":
                continue
            cell: dict[str, Any] = {
                "type": "table_cell",
                "raw_attrs": tc_node.get("attrs", {}),
                "cellAddr": _child_attrs(tc_node, "cellAddr"),
                "cellSpan": _child_attrs(tc_node, "cellSpan"),
                "cellSz": _child_attrs(tc_node, "cellSz"),
                "cellMargin": _child_attrs(tc_node, "cellMargin"),
                "paragraphs": [],
            }
            for p_node in walk_nodes(tc_node, "p"):
                p_attrs = p_node.get("attrs", {})
                para_id, _ = _resolve_para_char_refs(
                    p_attrs, style_map=style_map or {}
                )
                if para_id is None:
                    para_id = p_attrs.get("paraPrIDRef")
                cell_runs = _parse_text_runs(
                    p_node, char_style_map, style_map=style_map
                )
                cell["paragraphs"].append(
                    {
                        "type": "paragraph",
                        "paraPrIDRef": para_id,
                        "styleIDRef": p_attrs.get("styleIDRef"),
                        "paragraph_style": para_style_map.get(str(para_id)),
                        "runs": cell_runs,
                        "text": "".join(r.get("text", "") for r in cell_runs),
                        "raw_attrs": p_attrs,
                    }
                )
            row["cells"].append(cell)
        table["rows"].append(row)
    return table


def _parse_table_for_preview(
    tbl_node: dict[str, Any],
    para_style_map: dict[str, Any],
    char_style_map: dict[str, Any],
    *,
    style_map: dict[str, Any] | None = None,
) -> dict[str, Any]:
    stripped = _strip_tags_for_table(tbl_node)
    table = _parse_table(
        stripped, para_style_map, char_style_map, style_map=style_map
    )
    table["raw_node"] = copy.deepcopy(stripped)
    return table


def _parse_linesegarray(child: dict[str, Any]) -> dict[str, Any]:
    linesegs: list[dict[str, Any]] = []
    for lineseg in child.get("children", []):
        if local_tag(str(lineseg.get("tag", ""))) != "lineseg":
            continue
        a = lineseg.get("attrs", {})
        linesegs.append(
            {
                "textpos": _to_int(a.get("textpos")),
                "vertpos": _to_int(a.get("vertpos")),
                "vertsize": _to_int(a.get("vertsize")),
                "textheight": _to_int(a.get("textheight")),
                "baseline": _to_int(a.get("baseline")),
                "spacing": _to_int(a.get("spacing")),
                "horzpos": _to_int(a.get("horzpos")),
                "horzsize": _to_int(a.get("horzsize")),
                "flags": _to_int(a.get("flags")),
                "raw_attrs": a,
            }
        )
    return {"linesegs": linesegs}


def make_render_json(
    file_json: dict[str, Any],
    *,
    template_kind: str,
    include_tables: bool = True,
) -> dict[str, Any]:
    """
    step3 `make_render_json` — header 스타일 맵 + section 문단 runs/layout.

    include_tables=True 이면 hp:run 내 tbl 을 step4 표 run 으로 포함 (사업계획·평가).
    """
    header_root = file_json["header"]["data"]
    section_root = file_json["section"]["data"]
    settings_root = file_json["settings"]["data"]

    font_map: dict[str, str] = {}
    for font in walk_nodes(header_root, "font"):
        attrs = font.get("attrs", {})
        font_id = attrs.get("id")
        face = attrs.get("face")
        if font_id is not None and face:
            font_map[str(font_id)] = str(face)

    border_fill_map: dict[str, Any] = {}
    for bf in walk_nodes(header_root, "borderFill"):
        attrs = bf.get("attrs", {})
        bid = attrs.get("id")
        face: Any = None
        for node in walk_nodes(bf):
            if local_tag(str(node.get("tag", ""))) not in ("winBrush", "fillBrush"):
                continue
            candidate = (node.get("attrs") or {}).get("faceColor")
            if candidate is not None and str(candidate).lower() not in {"", "none"}:
                face = candidate
                break
            if face is None:
                face = candidate
        borders: dict[str, Any] = {}
        for side_name in ("leftBorder", "rightBorder", "topBorder", "bottomBorder"):
            child = first_child(bf, side_name)
            if child:
                key = side_name.replace("Border", "").lower()
                borders[key] = dict(child.get("attrs", {}))
        border_fill_map[str(bid)] = {
            "id": bid,
            "fill": {"faceColor": face},
            "borders": borders,
        }

    from app.application.hwpx.render.html_style import _BORDER_FILL_FACE_DEFAULTS, hwp_color_to_css

    for bid, default_face in _BORDER_FILL_FACE_DEFAULTS.items():
        entry = border_fill_map.get(bid)
        if entry is None:
            continue
        if not hwp_color_to_css(entry.get("fill", {}).get("faceColor")):
            entry.setdefault("fill", {})["faceColor"] = default_face

    style_map: dict[str, Any] = {}
    for style_node in walk_nodes(header_root, "style"):
        sattrs = style_node.get("attrs", {})
        sid = sattrs.get("id")
        if sid is not None:
            style_map[str(sid)] = dict(sattrs)

    char_style_map: dict[str, Any] = {}
    for char_pr in walk_nodes(header_root, "charPr"):
        attrs = char_pr.get("attrs", {})
        char_id = attrs.get("id")
        font_ref = first_child(char_pr, "fontRef")
        font_id = font_ref.get("attrs", {}).get("hangul") if font_ref else None
        height = _to_int(attrs.get("height"))
        size_pt = height / 100.0 if height is not None else None
        char_style_map[str(char_id)] = {
            "id": char_id,
            "font_id": font_id,
            "font": font_map.get(str(font_id)) if font_id is not None else None,
            "height": height,
            "size_pt": size_pt,
            "size_px_guess": round(size_pt * 96 / 72) if size_pt else None,
            "textColor": attrs.get("textColor"),
            "shadeColor": attrs.get("shadeColor"),
            "bold": first_child(char_pr, "bold") is not None,
            "italic": first_child(char_pr, "italic") is not None,
            "underline": (
                first_child(char_pr, "underline").get("attrs", {})
                if first_child(char_pr, "underline")
                else None
            ),
            "strikeout": (
                first_child(char_pr, "strikeout").get("attrs", {})
                if first_child(char_pr, "strikeout")
                else None
            ),
            "raw_attrs": attrs,
        }

    para_style_map: dict[str, Any] = {}
    for para_pr in walk_nodes(header_root, "paraPr"):
        attrs = para_pr.get("attrs", {})
        para_id = attrs.get("id")
        align = heading = line_spacing = None
        for child in para_pr.get("children", []):
            ctag = local_tag(str(child.get("tag", "")))
            cattrs = child.get("attrs", {})
            if ctag == "align":
                align = cattrs
            elif ctag == "heading":
                heading = cattrs
            elif ctag == "lineSpacing":
                line_spacing = cattrs
        para_style_map[str(para_id)] = {
            "id": para_id,
            "align": align,
            "heading": heading,
            "lineSpacing": line_spacing,
            "raw_attrs": attrs,
        }

    paragraphs: list[dict[str, Any]] = []

    for p_index, p in enumerate(_iter_body_paragraph_nodes(section_root)):
        p_attrs = p.get("attrs", {})
        para_id, default_char_id = _resolve_para_char_refs(p_attrs, style_map=style_map)
        if para_id is None:
            para_id = p_attrs.get("paraPrIDRef")
        runs: list[dict[str, Any]] = []
        layout = None

        for run_index, child in enumerate(p.get("children", [])):
            ctag = local_tag(str(child.get("tag", "")))

            if ctag == "run":
                tbl = first_child(child, "tbl")
                run_attrs = child.get("attrs", {})
                char_id = run_attrs.get("charPrIDRef") or default_char_id
                leading_text = _get_outside_table_text_from_run(child)
                if leading_text:
                    runs.append(
                        {
                            "type": "text_run",
                            "run_index": run_index,
                            "text": leading_text,
                            "charPrIDRef": char_id,
                            "style": char_style_map.get(str(char_id)),
                            "raw_attrs": run_attrs,
                        }
                    )
                if include_tables and tbl is not None:
                    runs.append(
                        _parse_table_for_preview(
                            tbl,
                            para_style_map,
                            char_style_map,
                            style_map=style_map,
                        )
                    )
                    continue
                text = _get_text_from_run(child)
                if text and not leading_text:
                    runs.append(
                        {
                            "type": "text_run",
                            "run_index": run_index,
                            "text": text,
                            "charPrIDRef": char_id,
                            "style": char_style_map.get(str(char_id)),
                            "raw_attrs": run_attrs,
                        }
                    )

            elif ctag == "linesegarray":
                layout = _parse_linesegarray(child)

        if runs or layout is not None:
            paragraphs.append(
                {
                    "type": "paragraph",
                    "index": p_index,
                    "paraPrIDRef": para_id,
                    "styleIDRef": p_attrs.get("styleIDRef"),
                    "paragraph_style": para_style_map.get(str(para_id)),
                    "runs": runs,
                    "layout": layout,
                    "raw_attrs": p_attrs,
                }
            )

    return {
        "type": RENDER_JSON_TYPE,
        "templateKind": template_kind,
        "source": {
            "section": file_json["section"].get("source_path"),
            "header": file_json["header"].get("source_path"),
            "settings": file_json["settings"].get("source_path"),
        },
        "maps": {
            "fonts": font_map,
            "char_styles": char_style_map,
            "para_styles": para_style_map,
            "border_fills": border_fill_map,
            "styles": style_map,
        },
        "document": {
            "paragraphs": paragraphs,
            "settings_raw": settings_root,
        },
    }
