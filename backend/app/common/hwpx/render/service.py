"""HWPX render_json 생성·적용·다운로드 (step2 치환 + step3 렌더링)."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from app.common.hwpx.filename import build_hwpx_download_filename
from app.common.hwpx.render.apply_form import apply_evaluation_form, apply_plan_form
from app.common.hwpx.render.byte_pack import pack_render_hwpx_bytes
from app.common.hwpx.render.custom_template_fill import (
    fill_custom_evaluation_hwpx,
    fill_custom_plan_hwpx,
)
from app.common.hwpx.render.file_json_render import (
    make_file_json_from_bytes,
    preview_from_file_json,
)
from app.common.hwpx.render.html_preview import (
    render_json_to_body_fragment,
    render_json_to_html,
)
from app.common.hwpx.render.page_canvas import wrap_page_canvas_html
from app.common.hwpx.render.pipeline import build_file_json_from_template
from app.common.hwpx.render.template_registry import (
    HwpxRenderTemplateKind,
    PLAN_TEMPLATE_TITLE,
    has_render_template,
)


@lru_cache(maxsize=8)
def _base_file_json_cached(kind: HwpxRenderTemplateKind, mtime_ns: int) -> str:
    import json

    del mtime_ns
    return json.dumps(build_file_json_from_template(kind), ensure_ascii=False)


_HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"


def _graft_and_fill_reference_sections(
    payload: bytes,
    sections: list[dict[str, Any]] | None,
) -> bytes:
    """추가 본문(대목차·목차·본문)을 HWPX에 반영.

    템플릿에 2열 참고 표가 있으면 base 빌드에서 이미 채워졌으므로 그대로 두고,
    없으면 ex_대목차+본문.hwpx의 9×2 참고 표를 그래프트(헤더 스타일 병합)한 뒤 값을 채운다.
    """
    doc_sections = [
        s
        for s in (sections or [])
        if isinstance(s, dict) and s.get("type") in ("heading", "body")
    ]
    if not doc_sections:
        return payload

    import io
    import zipfile

    from lxml import etree

    from app.common.hwpx.reference_table_template import (
        merge_heading_body_into_hwpx,
    )
    from app.common.hwpx.render.json_tree import _HWPX_XML_DECL
    from app.common.hwpx.render.plan_table_ops import (
        fill_reference_sections_table_lxml,
    )
    from app.common.hwpx.zip_package import pack_hwpx_zip_bytes

    hp = f"{{{_HP_NS}}}"

    def _two_col_ref(root: etree._Element) -> etree._Element | None:
        return next(
            (t for t in root.iter(f"{hp}tbl") if (t.get("colCnt") or "") == "2"),
            None,
        )

    def _serialize(root: etree._Element) -> bytes:
        for lineseg in list(root.iter(f"{hp}linesegarray")):
            parent = lineseg.getparent()
            if parent is not None:
                parent.remove(lineseg)
        body = etree.tostring(root, encoding="utf-8", xml_declaration=False, pretty_print=False)
        return _HWPX_XML_DECL + body

    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        base_section0 = zf.read("Contents/section0.xml")
    base_root = etree.fromstring(base_section0)
    if _two_col_ref(base_root) is not None:
        # 템플릿에 참고 표가 이미 있음 → base 빌드가 채웠으므로 그대로 둠
        return payload

    try:
        merged = merge_heading_body_into_hwpx(
            payload, replace_reference=False, merge_prv=True
        )
    except (FileNotFoundError, ValueError):
        # 추가본문 템플릿이 없으면 원본 유지(추가 본문만 누락, 나머지 정상)
        return payload

    with zipfile.ZipFile(io.BytesIO(merged)) as zf:
        section0 = zf.read("Contents/section0.xml")
    root = etree.fromstring(section0)
    ref = _two_col_ref(root)
    if ref is None:
        return merged

    fill_reference_sections_table_lxml(ref, doc_sections)
    new_section0 = _serialize(root)
    return pack_hwpx_zip_bytes(merged, {"Contents/section0.xml": new_section0})


_HH_NS = "http://www.hancom.co.kr/hwpml/2011/head"


def _unify_document_fonts(payload: bytes) -> bytes:
    """문서 전체 텍스트의 글꼴을 본문 글꼴로 통일(크기·굵기 등은 유지).

    section0에서 가장 많이 쓰인 charPr(=본문)의 fontRef를 기준으로,
    header.xml의 모든 charPr fontRef 언어별 글꼴 id를 같은 값으로 맞춘다.
    height(크기)·bold 등 다른 속성은 건드리지 않으므로 제목 크기 위계는 유지된다.
    """
    import io
    import zipfile
    from collections import Counter

    from lxml import etree

    from app.common.hwpx.render.json_tree import _HWPX_XML_DECL
    from app.common.hwpx.zip_package import pack_hwpx_zip_bytes

    hp = f"{{{_HP_NS}}}"
    hh = f"{{{_HH_NS}}}"

    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        names = set(zf.namelist())
        if "Contents/header.xml" not in names or "Contents/section0.xml" not in names:
            return payload
        section0 = zf.read("Contents/section0.xml")
        header = zf.read("Contents/header.xml")

    sroot = etree.fromstring(section0)
    counts: Counter[str] = Counter()
    for run in sroot.iter(f"{hp}run"):
        cid = run.get("charPrIDRef")
        if not cid:
            continue
        text = "".join("".join(t.itertext()) for t in run.iter(f"{hp}t"))
        if text.strip():
            counts[cid] += 1
    if not counts:
        return payload
    canonical_id = counts.most_common(1)[0][0]

    hroot = etree.fromstring(header)
    canonical_fontref = next(
        (
            cp.find(f"{hh}fontRef")
            for cp in hroot.iter(f"{hh}charPr")
            if cp.get("id") == canonical_id
        ),
        None,
    )
    if canonical_fontref is None or not len(canonical_fontref.attrib):
        return payload
    font_attrs = dict(canonical_fontref.attrib)

    changed = False
    for cp in hroot.iter(f"{hh}charPr"):
        fontref = cp.find(f"{hh}fontRef")
        if fontref is None:
            continue
        for key, val in font_attrs.items():
            if fontref.get(key) != val:
                fontref.set(key, val)
                changed = True
    if not changed:
        return payload

    new_header = _HWPX_XML_DECL + etree.tostring(
        hroot, encoding="utf-8", xml_declaration=False, pretty_print=False
    )
    return pack_hwpx_zip_bytes(
        payload,
        {"Contents/header.xml": new_header},
        allow_template_paths={"Contents/header.xml"},
    )


class HwpxRenderService:
    def has_template(self, kind: HwpxRenderTemplateKind) -> bool:
        return has_render_template(kind)

    def get_base_file_json(self, kind: HwpxRenderTemplateKind) -> dict[str, Any]:
        import json
        from app.common.hwpx.render.template_registry import render_template_hwpx_path

        path = render_template_hwpx_path(kind)
        mtime_ns = path.stat().st_mtime_ns if path.is_file() else 0
        return json.loads(_base_file_json_cached(kind, mtime_ns))

    def get_base_render_json(self, kind: HwpxRenderTemplateKind) -> dict[str, Any]:
        return preview_from_file_json(self.get_base_file_json(kind))

    def build_plan_file_json(
        self,
        form: dict[str, Any],
        *,
        sections: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return apply_plan_form(
            self.get_base_file_json("plan"),
            form,
            sections=sections,
            template_kind="plan",
        )

    def build_plan_render_json(
        self,
        form: dict[str, Any],
        *,
        sections: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return preview_from_file_json(self.build_plan_file_json(form, sections=sections))

    def build_evaluation_file_json(self, evaluation: dict[str, Any]) -> dict[str, Any]:
        return apply_evaluation_form(
            self.get_base_file_json("evaluation"), evaluation, template_kind="evaluation"
        )

    def build_evaluation_render_json(self, evaluation: dict[str, Any]) -> dict[str, Any]:
        return preview_from_file_json(self.build_evaluation_file_json(evaluation))

    def build_plan_hwpx(
        self,
        *,
        form_data: dict[str, Any],
        sections: list[dict[str, Any]] | None = None,
        template_bytes: bytes | None = None,
    ) -> tuple[bytes, str]:
        filename = build_hwpx_download_filename(
            str(form_data.get("projectName") or ""),
            doc_kind="plan",
            period=str(form_data.get("period") or ""),
        )
        if template_bytes is not None:
            # 업로드한 임의 양식 — 라벨 매칭 best-effort 채움(요약 표만), 원본 절대 보존
            payload = fill_custom_plan_hwpx(
                template_bytes, form_data, sections=sections
            )
            return payload, filename
        payload = pack_render_hwpx_bytes(
            "plan",
            form_data=form_data,
            sections=sections or [],
        )
        payload = _graft_and_fill_reference_sections(payload, sections)
        payload = _unify_document_fonts(payload)
        return payload, filename

    def build_evaluation_hwpx(
        self,
        *,
        evaluation: dict[str, Any],
        plan_form: dict[str, Any] | None = None,
        template_bytes: bytes | None = None,
    ) -> tuple[bytes, str]:
        del plan_form
        filename = build_hwpx_download_filename(
            str(evaluation.get("programName") or ""),
            doc_kind="evaluation",
            period=str(evaluation.get("period") or ""),
        )
        if template_bytes is not None:
            # 업로드한 임의 양식 — 라벨 매칭 best-effort 채움, 원본 절대 보존
            payload = fill_custom_evaluation_hwpx(template_bytes, evaluation)
            return payload, filename
        payload = pack_render_hwpx_bytes("evaluation", evaluation=evaluation)
        payload = _graft_and_fill_reference_sections(
            payload,
            evaluation.get("sections") if isinstance(evaluation.get("sections"), list) else [],
        )
        return payload, filename

    def build_plan_preview_html(
        self,
        form: dict[str, Any],
        *,
        sections: list[dict[str, Any]] | None = None,
        page_canvas: bool = True,
        template_bytes: bytes | None = None,
    ) -> str:
        # 다운로드 결과(추가 본문 그래프트 포함)와 동일하게 — 최종 HWPX 바이트에서 렌더
        payload, _ = self.build_plan_hwpx(
            form_data=form, sections=sections, template_bytes=template_bytes
        )
        render_json = preview_from_file_json(
            make_file_json_from_bytes(payload, template_kind="plan")
        )
        body = render_json_to_body_fragment(render_json)
        if not page_canvas:
            return render_json_to_html(render_json)
        return wrap_page_canvas_html(
            body,
            title=PLAN_TEMPLATE_TITLE,
            document_title=None,
            header_label="사회복지사업 단위사업계획서 · HWPX 미리보기",
        )

    def build_evaluation_preview_html(
        self,
        evaluation: dict[str, Any],
        *,
        page_canvas: bool = True,
        template_bytes: bytes | None = None,
    ) -> str:
        # 다운로드 결과(추가 본문 그래프트 포함)와 동일하게 — 최종 HWPX 바이트에서 렌더
        payload, _ = self.build_evaluation_hwpx(
            evaluation=evaluation, template_bytes=template_bytes
        )
        render_json = preview_from_file_json(
            make_file_json_from_bytes(payload, template_kind="evaluation")
        )
        body = render_json_to_body_fragment(render_json)
        title = str(evaluation.get("programName") or "사업평가서")
        doc_title = f"{title} 최종사업평가서"
        if not page_canvas:
            return render_json_to_html(render_json)
        return wrap_page_canvas_html(
            body,
            title=doc_title,
            document_title=None,
            header_label="최종사업평가서 · HWPX 미리보기",
        )
