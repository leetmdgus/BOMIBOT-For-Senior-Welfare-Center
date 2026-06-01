"""노트북 step1/step4 — JSON dict ↔ lxml (OWPML 네임스페이스)."""

from __future__ import annotations

from typing import Any

from lxml import etree

HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HS_NS = "http://www.hancom.co.kr/hwpml/2011/section"

# section0.xml에서 쓰이는 태그 (strip_ns 기준)
_HP_TAGS = frozenset(
    {
        "p",
        "run",
        "t",
        "tbl",
        "tr",
        "tc",
        "subList",
        "linesegarray",
        "lineseg",
        "cellAddr",
        "cellSpan",
        "cellSz",
        "cellMargin",
        "sz",
        "pos",
        "outMargin",
        "inMargin",
    }
)


def str_attrs(attrs: dict[str, Any] | None) -> dict[str, str]:
    if not attrs:
        return {}
    return {str(k): str(v) for k, v in attrs.items() if v is not None}


def _qname(tag: str) -> str:
    if tag == "sec":
        return f"{{{HS_NS}}}sec"
    if tag in _HP_TAGS:
        return f"{{{HP_NS}}}{tag}"
    return tag


def json_dict_to_lxml(data: dict[str, Any]) -> etree._Element:
    """노트북 json_to_xml_elem — hp:/hs: 네임스페이스 적용."""
    elem = etree.Element(_qname(str(data["tag"])), str_attrs(data.get("attrs")))
    text = data.get("text", "")
    if text:
        elem.text = str(text)
    for child in data.get("children", []):
        elem.append(json_dict_to_lxml(child))
    return elem
