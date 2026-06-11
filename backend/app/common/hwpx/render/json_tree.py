"""step2 JSON↔XML 트리 — 네임스페이스·tail 보존 (lxml 직렬화)."""

from __future__ import annotations

from typing import Any

from lxml import etree

_HWPX_XML_DECL = b'<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'


def local_tag(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


def xml_to_dict(elem: etree._Element) -> dict[str, Any]:
    """step2 hwpx_xml_to_json — tag에 네임스페이스 URI 포함."""
    return {
        "tag": elem.tag,
        "attrs": dict(elem.attrib),
        "text": elem.text or "",
        "tail": elem.tail or "",
        "children": [xml_to_dict(child) for child in elem],
    }


def json_node_to_xml_elem(
    data: dict[str, Any],
    *,
    nsmap: dict[str, str] | None = None,
) -> etree._Element:
    """step2 json_node_to_xml_elem — lxml으로 hp:/hs: 접두사 유지."""
    attrs = {
        str(k): str(v) for k, v in data.get("attrs", {}).items() if v is not None
    }
    tag = str(data["tag"])
    if nsmap:
        elem: etree._Element = etree.Element(tag, attrib=attrs, nsmap=nsmap)
    else:
        elem = etree.Element(tag, attrib=attrs)
    text = data.get("text")
    if text:
        elem.text = text
    for child_data in data.get("children", []):
        child = json_node_to_xml_elem(child_data)
        tail = child_data.get("tail")
        if tail:
            child.tail = tail
        elem.append(child)
    return elem


def section_data_to_bytes(section_data: dict[str, Any]) -> bytes:
    return json_part_to_bytes(section_data)


def json_part_to_bytes(
    part_data: dict[str, Any],
    *,
    nsmap: dict[str, str] | None = None,
) -> bytes:
    """step2 write_json_xml_parts — 한컴 형식 UTF-8 XML (hp: 접두사 유지)."""
    root = json_node_to_xml_elem(part_data, nsmap=nsmap)
    body = etree.tostring(root, encoding="utf-8", xml_declaration=False, pretty_print=False)
    return _HWPX_XML_DECL + body


def write_json_xml_parts_bytes(file_json: dict[str, Any]) -> dict[str, bytes]:
    """step2 write_json_xml_parts — section/header/settings → ZIP 엔트리 바이트."""
    parts: dict[str, bytes] = {}
    mapping = (
        ("section", "Contents/section0.xml"),
        ("header", "Contents/header.xml"),
        ("settings", "settings.xml"),
    )
    for key, zip_path in mapping:
        part = file_json[key]
        nsmap = part.get("nsmap")
        parts[zip_path] = json_part_to_bytes(part["data"], nsmap=nsmap)
    return parts


def walk_nodes(node: dict[str, Any], tag: str | None = None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if tag is None or local_tag(str(node.get("tag", ""))) == tag:
        out.append(node)
    for child in node.get("children", []):
        out.extend(walk_nodes(child, tag))
    return out


def first_child(node: dict[str, Any], tag: str) -> dict[str, Any] | None:
    for child in node.get("children", []):
        if local_tag(str(child.get("tag", ""))) == tag:
            return child
    return None
