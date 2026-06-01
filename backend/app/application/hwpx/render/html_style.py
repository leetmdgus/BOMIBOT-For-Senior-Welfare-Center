"""HWPX render_json → HTML CSS (charPr / paraPr / borderFill → 한글 근사)."""

from __future__ import annotations

import html
import re
from typing import Any

# HWPUNIT: 7200 = 1 inch = 96 CSS px
_HWPUNIT_PER_PX = 7200 / 96


def hwp_color_to_css(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"none", "transparent", "auto"}:
        return None
    if text.startswith("#"):
        return text
    return text


def hwpunit_to_px(value: Any) -> int | None:
    """HWPUNIT → CSS px (셀 너비·높이)."""
    try:
        units = int(value)
    except (TypeError, ValueError):
        return None
    if units <= 0:
        return None
    return max(1, round(units / _HWPUNIT_PER_PX))


def hwpunit_to_pt(value: Any) -> float | None:
    """HWPUNIT → pt (여백 등)."""
    px = hwpunit_to_px(value)
    if px is None:
        return None
    return px * 72 / 96


def char_height_to_pt(height: Any) -> float | None:
    """charPr height — 100 단위 = 1pt."""
    try:
        h = int(height)
    except (TypeError, ValueError):
        return None
    if h <= 0:
        return None
    return h / 100.0


def paragraph_text_align(paragraph: dict[str, Any]) -> str:
    para_style = paragraph.get("paragraph_style") or {}
    align = para_style.get("align") or {}
    value = (
        align.get("horizontal")
        or align.get("textAlign")
        or align.get("align")
        or align.get("type")
    )
    if not value:
        raw = para_style.get("raw_attrs") or {}
        value = raw.get("align")
    if not value:
        raw_p = paragraph.get("raw_attrs") or {}
        value = raw_p.get("align")
    align_map = {
        "LEFT": "left",
        "CENTER": "center",
        "RIGHT": "right",
        "JUSTIFY": "justify",
        "BOTH": "justify",
        "DISTRIBUTE": "justify",
    }
    return align_map.get(str(value or "").upper(), "left")


def paragraph_vertical_align(paragraph: dict[str, Any]) -> str:
    para_style = paragraph.get("paragraph_style") or {}
    align = para_style.get("align") or {}
    value = str(align.get("vertical") or "TOP").upper()
    vertical_map = {
        "CENTER": "middle",
        "TOP": "top",
        "BOTTOM": "bottom",
        "BASELINE": "top",
    }
    return vertical_map.get(value, "top")


def paragraph_line_height_css(paragraph: dict[str, Any]) -> str | None:
    """paraPr lineSpacing → CSS line-height."""
    para_style = paragraph.get("paragraph_style") or {}
    spacing = para_style.get("lineSpacing") or {}
    if not spacing:
        return None
    stype = str(spacing.get("type") or "").upper()
    raw = spacing.get("value") or spacing.get("unit")
    try:
        val = int(raw) if raw is not None else None
    except (TypeError, ValueError):
        val = None
    if val is None:
        return None
    if stype in {"PERCENT", "RELATIVE"}:
        return f"{max(100, val) / 100:.2f}"
    if stype in {"FIXED", "ATLEAST"}:
        pt = val / 100.0
        return f"{pt:.2f}pt"
    return None


def paragraph_css(paragraph: dict[str, Any]) -> list[str]:
    css = [
        f"text-align:{paragraph_text_align(paragraph)}",
        "margin:0",
        "white-space:pre-wrap",
    ]
    lh = paragraph_line_height_css(paragraph)
    if lh:
        css.append(f"line-height:{lh}")
    else:
        css.append("line-height:1.48")
    return css


def char_style_css(style: dict[str, Any] | None) -> list[str]:
    if not style:
        return []

    css: list[str] = []

    font = style.get("font")
    if font:
        css.append(f"font-family:'{font}','Malgun Gothic','맑은 고딕',sans-serif")

    size_pt = style.get("size_pt")
    if size_pt:
        css.append(f"font-size:{size_pt:.2f}pt")
    elif style.get("size_px_guess"):
        css.append(f"font-size:{style['size_px_guess']}px")

    color = hwp_color_to_css(style.get("textColor"))
    if color:
        css.append(f"color:{color}")

    shade = hwp_color_to_css(style.get("shadeColor"))
    if shade:
        css.append(f"background-color:{shade}")

    if style.get("bold"):
        css.append("font-weight:bold")
    if style.get("italic"):
        css.append("font-style:italic")

    decorations: list[str] = []
    underline = style.get("underline")
    if isinstance(underline, dict):
        utype = str(underline.get("type") or "NONE").upper()
        if utype not in {"NONE", ""}:
            decorations.append("underline")
    strikeout = style.get("strikeout")
    if isinstance(strikeout, dict):
        shape = str(strikeout.get("shape") or "NONE").upper()
        if shape not in {"NONE", ""}:
            decorations.append("line-through")
    if decorations:
        css.append(f"text-decoration:{' '.join(decorations)}")

    return css


def run_to_span(run: dict[str, Any]) -> str:
    text = html.escape(str(run.get("text", "")))
    if not text and run.get("preserve_space"):
        text = " "
    css = char_style_css(run.get("style") or {})
    style_attr = f' style="{"; ".join(css)}"' if css else ""
    return f"<span{style_attr}>{text or '&nbsp;'}</span>"


def border_fill_face_color(
    border_fill_map: dict[str, Any],
    ref_id: Any,
) -> str | None:
    if ref_id is None:
        return None
    entry = border_fill_map.get(str(ref_id)) or {}
    fill = entry.get("fill") or {}
    return hwp_color_to_css(fill.get("faceColor"))


def _border_side_css(side: dict[str, Any] | None) -> str | None:
    if not side:
        return None
    btype = str(side.get("type") or "NONE").upper()
    if btype in {"NONE", ""}:
        return None
    width = str(side.get("width") or "0.12 mm").strip()
    if not re.search(r"(mm|pt|px|em)$", width, re.I):
        width = f"{width} mm" if width else "0.12 mm"
    color = hwp_color_to_css(side.get("color")) or "#000000"
    style_map = {
        "SOLID": "solid",
        "DASH": "dashed",
        "DOT": "dotted",
        "DASH_DOT": "dashed",
        "DASH_DOT_DOT": "dashed",
    }
    line = style_map.get(btype, "solid")
    return f"{width} {line} {color}"


def border_fill_cell_border_css(
    border_fill_map: dict[str, Any],
    ref_id: Any,
) -> list[str]:
    """borderFill 테두리 — 한글 0.12mm SOLID 등."""
    if ref_id is None:
        return ["border:0.12mm solid #000"]
    entry = border_fill_map.get(str(ref_id)) or {}
    borders = entry.get("borders") or {}
    css: list[str] = []
    for css_side, key in (
        ("border-left", "left"),
        ("border-right", "right"),
        ("border-top", "top"),
        ("border-bottom", "bottom"),
    ):
        spec = _border_side_css(borders.get(key))
        if spec:
            css.append(f"{css_side}:{spec}")
    if css:
        for css_side, key in (
            ("border-left", "left"),
            ("border-right", "right"),
            ("border-top", "top"),
            ("border-bottom", "bottom"),
        ):
            if not any(part.startswith(css_side) for part in css):
                spec = _border_side_css(borders.get(key))
                css.append(f"{css_side}:{spec or '0.12mm solid #000'}")
        return css
    return ["border:0.12mm solid #000"]


def cell_margin_css(cell_margin: dict[str, Any] | None) -> str | None:
    if not cell_margin:
        return None
    parts: list[str] = []
    for key, css_key in (
        ("top", "padding-top"),
        ("right", "padding-right"),
        ("bottom", "padding-bottom"),
        ("left", "padding-left"),
    ):
        pt = hwpunit_to_pt(cell_margin.get(key))
        if pt is not None:
            parts.append(f"{css_key}:{pt:.2f}pt")
    return ";".join(parts) if parts else None


_LABEL_FACE_COLORS = frozenset({"#ECECEC", "#D9D9D9", "#ececec", "#d9d9d9"})


def is_label_face_color(face: str | None) -> bool:
    if not face:
        return False
    return face.upper() in {c.upper() for c in _LABEL_FACE_COLORS}


_BORDER_FILL_FACE_DEFAULTS: dict[str, str] = {
    "3": "#FFFFFF",
    "4": "#D9D9D9",
    "5": "#FFFFFF",
}


def cell_td_background(
    border_fill_map: dict[str, Any],
    raw_attrs: dict[str, Any] | None,
    *,
    border_ref: Any = None,
    col_addr: int | None = None,
    col_count: int = 1,
) -> str | None:
    attrs = raw_attrs or {}
    ref = border_ref if border_ref is not None else attrs.get("borderFillIDRef")
    header = str(attrs.get("header", "0"))

    face = border_fill_face_color(border_fill_map, ref)
    if face:
        return face

    if header == "1":
        return "#ECECEC"

    if ref is not None:
        default = _BORDER_FILL_FACE_DEFAULTS.get(str(ref))
        if default:
            return default

    if col_count >= 2 and col_addr == 0:
        return "#D9D9D9"
    if col_count >= 2 and col_addr is not None and col_addr > 0:
        return "#FFFFFF"

    return None


def cell_td_css_class(
    background: str | None,
    raw_attrs: dict[str, Any] | None,
    *,
    colspan: int = 1,
    col_count: int = 1,
    col_addr: int | None = None,
) -> str:
    attrs = raw_attrs or {}
    header = str(attrs.get("header", "0"))
    label_bg = header == "1" or is_label_face_color(background)

    if label_bg and colspan >= col_count and col_count > 1:
        return "hwpx-doc__band"

    if label_bg:
        if col_count >= 4 and col_addr == 1:
            return "hwpx-doc__sublabel"
        return "hwpx-doc__label"

    if col_count >= 2 and col_addr == 0 and colspan < col_count:
        return "hwpx-doc__label"

    if background and str(background).upper() == "#FFFFFF":
        return "hwpx-doc__value"

    if col_count >= 2 and col_addr is not None and col_addr > 0:
        return "hwpx-doc__value"
    return ""


def cell_td_extra_css(
    raw_attrs: dict[str, Any] | None,
    *,
    css_class: str = "",
) -> list[str]:
    """라벨·밴드 셀 — 정렬만 (색·크기·굵기는 charPr span)."""
    attrs = raw_attrs or {}
    if css_class in {"hwpx-doc__label", "hwpx-doc__sublabel", "hwpx-doc__band"}:
        return ["text-align:center", "line-height:1.35", "vertical-align:middle"]
    if str(attrs.get("header", "0")) == "1":
        return ["text-align:center", "line-height:1.35"]
    return []
