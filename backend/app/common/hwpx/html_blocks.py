"""리치텍스트 HTML → HWPX 문단·표 (AST → HwpxTable)."""

from __future__ import annotations

from lxml import html as lhtml

from app.common.hwpx.ast.ast_bridge import ast_to_hwpx_table
from app.common.hwpx.ast.html_table_to_ast import html_table_element_to_ast
from app.common.hwpx.encoding import sanitize_hwpx_text, strip_html
from app.common.hwpx.models import HwpxParagraph, HwpxTable


def _html_table_to_hwpx(table_el) -> HwpxTable:
    return ast_to_hwpx_table(html_table_element_to_ast(table_el))


def html_to_hwpx_blocks(html: str) -> tuple[list[HwpxParagraph], list[HwpxTable]]:
    paragraphs: list[HwpxParagraph] = []
    tables: list[HwpxTable] = []

    if not (html or "").strip():
        return paragraphs, tables

    try:
        root = lhtml.fragment_fromstring(html, create_parent="div")
    except lhtml.ParserError:
        plain = strip_html(html)
        if plain:
            paragraphs.append(HwpxParagraph(text=plain, variant="body"))
        return paragraphs, tables

    def push_paragraph(text: str, variant: str = "body") -> None:
        t = text.strip()
        if t:
            paragraphs.append(
                HwpxParagraph(text=t, variant=variant)  # type: ignore[arg-type]
            )

    def cell_text(el) -> str:
        raw = " ".join((el.text_content() or "").split())
        return sanitize_hwpx_text(raw) or " "

    def walk(parent) -> None:
        for node in parent:
            if not hasattr(node, "tag"):
                text = str(node).strip() if node is not None else ""
                if text:
                    push_paragraph(text, "body")
                continue

            tag = (node.tag or "").lower()
            if tag == "table":
                tables.append(_html_table_to_hwpx(node))
                continue
            if tag in ("h1", "h2") or "doc-chapter" in (node.get("class") or ""):
                push_paragraph(cell_text(node), "heading")
                continue
            if tag in ("h3", "h4") or any(
                c in (node.get("class") or "")
                for c in ("doc-section", "doc-section-plain")
            ):
                push_paragraph(cell_text(node), "heading")
                continue
            if tag in ("p", "li"):
                push_paragraph(cell_text(node), "body")
                continue
            if tag == "br":
                continue
            if tag == "img":
                alt = sanitize_hwpx_text(node.get("alt") or "") or "[이미지]"
                push_paragraph(alt, "body")
                continue
            if tag in ("div", "ul", "ol", "tbody", "thead"):
                walk(node)
                continue
            push_paragraph(cell_text(node), "body")

    walk(root)

    if not paragraphs and not tables:
        plain = strip_html(html)
        if plain:
            paragraphs.append(HwpxParagraph(text=plain, variant="body"))

    return paragraphs, tables
