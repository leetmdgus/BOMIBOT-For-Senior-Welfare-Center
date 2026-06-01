"""step3 render_json_to_section_xml (+ step4 표 raw_node)."""

from __future__ import annotations

from typing import Any

from lxml import etree

from app.application.hwpx.render.xml_utils import HP_NS, json_dict_to_lxml, str_attrs


def render_json_to_section_bytes(
    render_json: dict[str, Any],
    *,
    template_section0: bytes,
) -> bytes:
    """
    step4 `render_json_to_section_xml`와 동일.

    - 표 run: `raw_node` 트리를 그대로 삽입 (한글 구조 보존)
    - 텍스트 run / linesegarray: 노트북과 동일 규칙
    - 루트 요소·xmlns: 템플릿 section0에서 복제
    """
    template_root = etree.fromstring(template_section0)
    root = etree.Element(
        template_root.tag,
        attrib=dict(template_root.attrib),
        nsmap=template_root.nsmap,
    )

    paragraphs = render_json.get("document", {}).get("paragraphs", [])

    for paragraph in paragraphs:
        raw_p_attrs = paragraph.get("raw_attrs", {}) or {}

        p_attrs = {
            "id": raw_p_attrs.get("id", "0"),
            "paraPrIDRef": paragraph.get(
                "paraPrIDRef", raw_p_attrs.get("paraPrIDRef", "0")
            ),
            "styleIDRef": paragraph.get(
                "styleIDRef", raw_p_attrs.get("styleIDRef", "0")
            ),
            "pageBreak": raw_p_attrs.get("pageBreak", "0"),
            "columnBreak": raw_p_attrs.get("columnBreak", "0"),
            "merged": raw_p_attrs.get("merged", "0"),
        }

        p_elem = etree.SubElement(root, f"{{{HP_NS}}}p", str_attrs(p_attrs))

        for run in paragraph.get("runs", []):
            if run.get("type") == "table":
                run_elem = etree.SubElement(
                    p_elem, f"{{{HP_NS}}}run", {"charPrIDRef": "0"}
                )
                raw_node = run.get("raw_node")
                if raw_node:
                    run_elem.append(json_dict_to_lxml(raw_node))
                t_elem = etree.SubElement(run_elem, f"{{{HP_NS}}}t")
                t_elem.text = ""
                continue

            run_attrs = run.get("raw_attrs", {}) or {}
            run_elem = etree.SubElement(
                p_elem,
                f"{{{HP_NS}}}run",
                str_attrs(
                    {
                        "charPrIDRef": run.get(
                            "charPrIDRef", run_attrs.get("charPrIDRef", "0")
                        )
                    }
                ),
            )
            text = run.get("text", "")
            if text:
                t_elem = etree.SubElement(run_elem, f"{{{HP_NS}}}t")
                t_elem.text = str(text)

        layout = paragraph.get("layout") or {}
        linesegs = layout.get("linesegs", [])
        if linesegs:
            linesegarray_elem = etree.SubElement(p_elem, f"{{{HP_NS}}}linesegarray")
            for lineseg in linesegs:
                raw_attrs = lineseg.get("raw_attrs", {}) or {}
                lineseg_attrs = {
                    "textpos": lineseg.get("textpos", raw_attrs.get("textpos")),
                    "vertpos": lineseg.get("vertpos", raw_attrs.get("vertpos")),
                    "vertsize": lineseg.get("vertsize", raw_attrs.get("vertsize")),
                    "textheight": lineseg.get(
                        "textheight", raw_attrs.get("textheight")
                    ),
                    "baseline": lineseg.get("baseline", raw_attrs.get("baseline")),
                    "spacing": lineseg.get("spacing", raw_attrs.get("spacing")),
                    "horzpos": lineseg.get("horzpos", raw_attrs.get("horzpos")),
                    "horzsize": lineseg.get("horzsize", raw_attrs.get("horzsize")),
                    "flags": lineseg.get("flags", raw_attrs.get("flags")),
                }
                etree.SubElement(
                    linesegarray_elem,
                    f"{{{HP_NS}}}lineseg",
                    str_attrs(lineseg_attrs),
                )

    return etree.tostring(
        root,
        encoding="UTF-8",
        xml_declaration=True,
        standalone=False,
    )
