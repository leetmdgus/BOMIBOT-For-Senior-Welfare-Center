"""step2 — section.data 트리에서 표 셀(cellAddr) 텍스트 치환."""

from __future__ import annotations

from typing import Any, Callable

from app.common.hwpx.encoding import sanitize_hwpx_text
from app.common.hwpx.render.json_tree import first_child, local_tag, walk_nodes


def _split_lines(value: str) -> list[str]:
    text = sanitize_hwpx_text(value).strip() or " "
    lines = [ln for ln in text.split("\n") if ln.strip()]
    return lines if lines else [" "]


def _hp_t_tag_from_tc(tc: dict[str, Any]) -> str:
    for node in walk_nodes(tc):
        tag = str(node.get("tag", ""))
        if local_tag(tag) == "t":
            return tag
        if local_tag(tag) == "run":
            run_tag = tag
            if "}" in run_tag:
                return run_tag.rsplit("}", 1)[0] + "}t"
    return "{http://www.hancom.co.kr/hwpml/2011/paragraph}t"


def _ensure_t_nodes(tc: dict[str, Any]) -> list[dict[str, Any]]:
    t_nodes = [n for n in walk_nodes(tc) if local_tag(str(n.get("tag", ""))) == "t"]
    if t_nodes:
        return t_nodes

    t_tag = _hp_t_tag_from_tc(tc)
    for node in walk_nodes(tc):
        if local_tag(str(node.get("tag", ""))) != "run":
            continue
        t_node = {"tag": t_tag, "attrs": {}, "text": " ", "tail": "", "children": []}
        node.setdefault("children", []).append(t_node)
        return [t_node]
    return []


def _set_t_nodes(tc: dict[str, Any], value: str) -> None:
    """셀 내 hp:t 노드 .text만 변경 (step2 방식). 빈 run에는 t 노드를 추가."""
    t_nodes = _ensure_t_nodes(tc)
    if not t_nodes:
        return
    lines = _split_lines(value)
    if len(lines) <= len(t_nodes):
        padded = lines + [" "] * (len(t_nodes) - len(lines))
    else:
        padded = lines[: len(t_nodes) - 1] + ["\n".join(lines[len(t_nodes) - 1 :])]
    for node, line in zip(t_nodes, padded):
        node["text"] = line or " "


def _cells_by_addr(tbl: dict[str, Any]) -> dict[tuple[int, int], dict[str, Any]]:
    out: dict[tuple[int, int], dict[str, Any]] = {}
    for tr in walk_nodes(tbl, "tr"):
        for tc in tr.get("children", []):
            if local_tag(str(tc.get("tag", ""))) != "tc":
                continue
            addr = first_child(tc, "cellAddr")
            if addr is None:
                continue
            attrs = addr.get("attrs", {})
            key = (int(attrs.get("rowAddr", -1)), int(attrs.get("colAddr", -1)))
            out[key] = tc
    return out


def _main_table(section_data: dict[str, Any]) -> dict[str, Any] | None:
    tables = walk_nodes(section_data, "tbl")
    return tables[0] if tables else None


def fill_table_cells(
    tbl: dict[str, Any],
    field_map: dict[tuple[int, int], str],
    resolver: Callable[[str], str],
) -> None:
    cells = _cells_by_addr(tbl)
    for (row, col), field_key in field_map.items():
        tc = cells.get((row, col))
        if tc is None:
            continue
        _set_t_nodes(tc, resolver(field_key))


def fill_section_table(
    section_data: dict[str, Any],
    field_map: dict[tuple[int, int], str],
    resolver: Callable[[str], str],
) -> None:
    tbl = _main_table(section_data)
    if tbl is None:
        return
    cells = _cells_by_addr(tbl)
    for (row, col), field_key in field_map.items():
        tc = cells.get((row, col))
        if tc is None:
            continue
        _set_t_nodes(tc, resolver(field_key))
