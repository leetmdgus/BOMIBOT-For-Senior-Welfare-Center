"""section0 / PrvText — HWPX 다운로드 (한글 변조 검사 대응).

텍스트 치환 시 hp:linesegarray(줄 레이아웃)가 무효화되면 한글 2024 변조 경고가 난다.
→ section0는 lxml으로 표만 채운 뒤 linesegarray 제거, PrvText는 줄 단위 동기화.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.application.hwpx.hwpx_image_embed import HwpxImageCatalog, reset_pic_ids
from typing import Any, Callable

from lxml import etree

from app.application.hwpx.encoding import escape_xml, prv_safe_value, sanitize_hwpx_text
from app.application.hwpx.reference_sections import (
    reference_prv_tail_tags,
    reference_prv_tail_values,
)
from app.application.hwpx.hwpx_templates import HwpxTemplateKind, load_section0_template_bytes
from app.application.hwpx.models import HwpxDocument
from app.application.hwpx.render.json_tree import _HWPX_XML_DECL
from app.application.hwpx.section0_template_fill import (
    HP_NS,
    _cells_by_addr,
    _direct_table_paragraphs,
    _fill_plan_main_table,
    _fill_table_from_field_map,
    _format_eval_date,
    plan_purpose_text,
)
from app.application.hwpx.template_cell_maps import (
    EVALUATION_MAIN_TABLE_VALUES,
    PLAN_MAIN_TABLE_VALUES,
    PLAN_SUBPROJECT_ROWS,
)

HP_T_CLOSE = b"</hp:t>"


def _goals_text_plain(goals: list[Any]) -> str:
    """section0 목표 셀 — 템플릿과 같이 • 글머리."""
    lines = [f"• {str(g).strip()}" for g in goals if str(g).strip()]
    return "\n".join(lines) if lines else "-"


def _cell_t_lines(tc: etree._Element, value: str) -> list[str]:
    lines = _split_lines(value)
    t_nodes = tc.findall(f".//{{{HP_NS}}}t")
    if not t_nodes:
        return lines
    if len(lines) <= len(t_nodes):
        return lines + [" "] * (len(t_nodes) - len(lines))
    return lines[: len(t_nodes) - 1] + ["\n".join(lines[len(t_nodes) - 1 :])]


def _prv_body_from_lines(lines: list[str]) -> str:
    parts = [ln.strip() for ln in lines if ln.strip()]
    if not parts:
        return " "
    if len(parts) == 1:
        return parts[0]
    return parts[0] + "".join(f" - {p}" for p in parts[1:])


def _prv_line_sep(prv: bytes) -> bytes:
    return b"\r\n" if b"\r\n" in prv else b"\n"


def _replace_prv_line_value(line: bytes, new_value: str) -> bytes:
    """`<태그><값>` 한 줄 — 전체 줄 바이트 길이 유지."""
    sep_idx = line.find(b"><")
    if sep_idx < 0 or not line.startswith(b"<") or not line.endswith(b">"):
        return line
    prefix = line[: sep_idx + 2]
    inner_len = len(line) - len(prefix) - 1
    val_b = _fit_utf8_bytes(
        (prv_safe_value(new_value) or " ").encode("utf-8"),
        inner_len,
    )
    return prefix + val_b + b">"


def _replace_prv_subproject_line(line: bytes, name: str, body: str) -> bytes:
    """세부사업 PrvText 줄 — `<이름><내용>` 전체 길이 유지."""
    total = len(line)
    if total < 5 or not line.startswith(b"<") or not line.endswith(b">"):
        return line
    name_b = (prv_safe_value(name) or " ").encode("utf-8")
    body_b = (prv_safe_value(body) or " ").encode("utf-8")
    max_payload = total - 4
    if len(name_b) + len(body_b) > max_payload:
        if len(name_b) >= max_payload:
            name_b = _fit_utf8_bytes(name_b, max(1, max_payload // 2))
        body_b = _fit_utf8_bytes(body_b, max(1, max_payload - len(name_b)))
    else:
        body_b = body_b + b" " * (max_payload - len(name_b) - len(body_b))
    new_line = b"<" + name_b + b"><" + body_b + b">"
    if len(new_line) != total:
        new_line = _fit_utf8_bytes(new_line, total)
    return new_line


def _patch_prv_tag_line(line: bytes, tag: str, new_value: str) -> bytes:
    """`<…><tag><value>` 한 줄 — 가능하면 줄 길이 유지, 빈 칸은 내용 길이만큼 확장."""
    tag_b = tag.encode("utf-8")
    needle = b"<" + tag_b + b"><"
    idx = line.find(needle)
    if idx < 0:
        return line
    inner_start = idx + len(needle)
    suffix_idx = line.find(b">", inner_start)
    if suffix_idx < 0:
        return line
    inner_len = suffix_idx - inner_start
    val = prv_safe_value(new_value) or " "
    val_b = val.encode("utf-8")
    if inner_len == 0 and val_b.strip():
        return line[:inner_start] + val_b + line[suffix_idx:]
    val_b = _fit_utf8_bytes(val_b, inner_len)
    return line[:inner_start] + val_b + line[suffix_idx:]


def _finalize_prv_bytes(original: bytes, lines: list[bytes], sep: bytes) -> bytes:
    """PrvText 전체 바이트 길이 — tail 확장 시 패딩/안전 절단으로 템플릿 길이 맞춤."""
    out = sep.join(lines)
    target = len(original)
    if len(out) < target:
        return out + b" " * (target - len(out))
    if len(out) == target:
        return out
    while len(out) > target and len(lines) > 1 and not lines[-1].strip():
        lines.pop()
        out = sep.join(lines)
    if len(out) <= target:
        return out + b" " * (target - len(out))
    return _fit_utf8_bytes(out, target)


def _encode_prv_tag_line(tag: str, value: str) -> bytes:
    val = prv_safe_value(value) or " "
    return f"<{tag}><{val}>".encode("utf-8")


def _find_reference_prv_tail_start(lines: list[bytes]) -> int | None:
    tag_b = "대목차".encode("utf-8")
    for idx, line in enumerate(lines):
        if b"<" + tag_b + b"><" in line:
            return idx
    return None


def _apply_reference_prv_tail(
    lines: list[bytes],
    sections: list[dict[str, Any]] | None,
) -> None:
    """sections 순서대로 PrvText tail — 태그(대목차·목차·본문) 전체 줄 교체·행 추가."""
    start = _find_reference_prv_tail_start(lines)
    if start is None:
        return
    values = reference_prv_tail_values(sections)
    tags = reference_prv_tail_tags(sections=sections)
    for offset, tag in enumerate(tags):
        idx = start + offset
        value = values[offset] if offset < len(values) else " "
        new_line = _encode_prv_tag_line(tag, value)
        if idx < len(lines):
            lines[idx] = new_line
        else:
            lines.append(new_line)


def _finalize_plan_prv_bytes(original: bytes, lines: list[bytes], sep: bytes) -> bytes:
    """사업계획 PrvText — 요약(head)은 길이 맞추고 reference tail은 잘리지 않게 허용 확장."""
    out = sep.join(lines)
    target = len(original)
    if len(out) <= target:
        return out + b" " * (target - len(out))

    tail_start = _find_reference_prv_tail_start(lines)
    if tail_start is None:
        return _fit_utf8_bytes(out, target)

    head = sep.join(lines[:tail_start])
    tail = sep.join(lines[tail_start:])
    budget = max(0, target - len(tail) - len(sep))
    if len(head) > budget and budget > 0:
        head = _fit_utf8_bytes(head, budget)
    out = head + sep + tail
    if len(out) >= target:
        return out
    return out + b" " * (target - len(out))


def rebuild_plan_prv_bytes(
    prv: bytes,
    form: dict[str, Any],
    *,
    sections: list[dict[str, Any]] | None = None,
) -> bytes:
    """
    사업계획 PrvText — 줄 단위로 formData 반영 (1480바이트 등 템플릿 길이 유지).

    section0 셀 첫 hp:t만으로는 PrvText 긴 필드(목적·목표)와 맞지 않아
    기존 _prv_tag_patch 방식은 동기화 실패 → 한글 변조 경고 원인.
    """
    sep = _prv_line_sep(prv)
    lines = prv.split(sep)

    main_resolvers = [
        lambda f: str(f.get("projectName") or ""),
        plan_purpose_text,
        lambda f: _goals_text_plain(f.get("goals") or []),
        lambda f: str(f.get("period") or ""),
        lambda f: str(f.get("target") or ""),
        lambda f: str(f.get("totalCount") or ""),
        lambda f: str(f.get("budget") or ""),
        lambda f: str(f.get("budgetCategory") or ""),
        lambda f: str(f.get("manager") or ""),
    ]
    for idx, resolve in enumerate(main_resolvers):
        if idx >= len(lines):
            break
        lines[idx] = _replace_prv_line_value(lines[idx], resolve(form))

    sub_projects = form.get("subProjects") or []
    for idx, proj in enumerate(sub_projects[:4]):
        line_idx = 11 + idx
        if line_idx >= len(lines):
            break
        item = proj or {}
        body_src = "\n".join(
            x
            for x in (
                str(item.get("output") or "").strip(),
                str(item.get("outcome") or "").strip(),
            )
            if x
        )
        lines[line_idx] = _replace_prv_subproject_line(
            lines[line_idx],
            str(item.get("name") or ""),
            body_src or " ",
        )

    _apply_reference_prv_tail(lines, sections)

    return _finalize_plan_prv_bytes(prv, lines, sep)


def rebuild_evaluation_prv_bytes(prv: bytes, evaluation: dict[str, Any]) -> bytes:
    """사업평가 PrvText — 요약 필드·sections tail 동기화 (바이트 길이 유지)."""
    from app.application.hwpx.render.evaluation_table_ops import resolve_evaluation_field

    sep = _prv_line_sep(prv)
    lines = list(prv.split(sep))

    def patch(tag: str, field_key: str, line_idx: int) -> None:
        if line_idx >= len(lines):
            return
        lines[line_idx] = _patch_prv_tag_line(
            lines[line_idx],
            tag,
            resolve_evaluation_field(evaluation, field_key),
        )

    patch("사업팀", "team", 0)
    patch("담당자", "manager", 0)
    patch("사업기간", "period", 1)
    patch("평가일", "evaluationDate", 1)
    patch("프로그램명", "programName", 2)
    patch("대상", "target", 2)
    patch("계획 인원(명/회)", "planCount", 3)
    patch("예산(원)", "planBudget", 3)
    patch("실행 인원(명/회)", "actualCount", 4)
    patch("지출(원)", "actualExpense", 4)
    patch("목적", "purpose", 5)
    patch("목표", "goals", 5)
    patch("성과지표", "performanceIndicator", 6)
    patch("평가도구", "evaluationTool", 6)
    if len(lines) > 7:
        lines[7] = _patch_prv_tag_line(
            lines[7],
            "성과 주요 요인 분석",
            resolve_evaluation_field(evaluation, "keyFactorAnalysis"),
        )
        lines[7] = _patch_prv_tag_line(
            lines[7],
            "목표 적절성",
            resolve_evaluation_field(evaluation, "goalAppropriacy"),
        )
        lines[7] = _patch_prv_tag_line(
            lines[7],
            "제언 및 향후 계획",
            resolve_evaluation_field(evaluation, "suggestion"),
        )

    _apply_reference_prv_tail(lines, evaluation.get("sections"))

    return _finalize_plan_prv_bytes(prv, lines, sep)


def _prv_named_row_patch(
    prv: bytes, label_old: str, body_old: str, label_new: str, body_new: str
) -> _BytePatch | None:
    old_b = f"<{label_old}><{body_old}>".encode("utf-8")
    if prv.count(old_b) != 1:
        return None
    if label_old != label_new:
        new_b = f"<{label_new}><{sanitize_hwpx_text(body_new) or ' '}>".encode("utf-8")
        if old_b == new_b:
            return None
        return _BytePatch(old=old_b, new=new_b)
    prefix = f"<{label_new}><".encode("utf-8")
    suffix = b">"
    inner_len = len(old_b) - len(prefix) - len(suffix)
    val_b = _fit_utf8_bytes(
        (sanitize_hwpx_text(body_new) or " ").encode("utf-8"),
        inner_len,
    )
    new_b = prefix + val_b + suffix
    if old_b == new_b:
        return None
    return _BytePatch(old=old_b, new=new_b)


def _prv_row_body(prv: bytes, label: str) -> str:
    import re

    text = prv.decode("utf-8")
    m = re.search(rf"<{re.escape(label)}><([^>]*)>", text)
    return m.group(1) if m else ""


@dataclass(frozen=True)
class _BytePatch:
    old: bytes
    new: bytes


def _encode_t_inner(text: str) -> bytes:
    return escape_xml(sanitize_hwpx_text(text) or " ").encode("utf-8")


def _fit_utf8_bytes(data: bytes, size: int) -> bytes:
    """한컴 ZIP 무결성 — 치환 후 바이트 길이 유지(공백 패딩/UTF-8 안전 절단)."""
    if len(data) == size:
        return data
    if len(data) < size:
        return data + b" " * (size - len(data))
    cut = data[:size]
    while cut:
        try:
            cut.decode("utf-8")
            break
        except UnicodeDecodeError:
            cut = cut[:-1]
    if len(cut) < size:
        cut = cut + b" " * (size - len(cut))
    return cut


def _strip_all_linesegarray(root: etree._Element) -> None:
    """한컴 권장 — hp:t 변경 후 무효 linesegarray 제거 (변조 경고 방지)."""
    hp = f"{{{HP_NS}}}"
    for lineseg in list(root.findall(f".//{hp}linesegarray")):
        parent = lineseg.getparent()
        if parent is not None:
            parent.remove(lineseg)


def _serialize_section0_root(root: etree._Element) -> bytes:
    body = etree.tostring(
        root,
        encoding="utf-8",
        xml_declaration=False,
        pretty_print=False,
    )
    return _HWPX_XML_DECL + body


def _main_table(root: etree._Element) -> etree._Element | None:
    paras = _direct_table_paragraphs(root)
    if not paras:
        return None
    return paras[0].find(f".//{{{HP_NS}}}tbl")


@dataclass(frozen=True)
class Section0BuildResult:
    section0: bytes
    image_catalog: HwpxImageCatalog


def build_plan_section0_for_download(
    section0: bytes,
    form: dict[str, Any],
    *,
    sections: list[dict[str, Any]] | None = None,
) -> Section0BuildResult:
    from app.application.hwpx.render.plan_table_ops import fill_all_plan_tables_lxml_with_form

    reset_pic_ids()
    catalog = HwpxImageCatalog()
    root = etree.fromstring(section0)
    fill_all_plan_tables_lxml_with_form(
        root, form, sections=sections, image_catalog=catalog
    )
    _strip_all_linesegarray(root)
    return Section0BuildResult(
        section0=_serialize_section0_root(root),
        image_catalog=catalog,
    )


def build_evaluation_section0_for_download(
    section0: bytes, evaluation: dict[str, Any]
) -> Section0BuildResult:
    from app.application.hwpx.render.evaluation_table_ops import (
        fill_all_evaluation_tables_lxml,
    )

    reset_pic_ids()
    catalog = HwpxImageCatalog()
    root = etree.fromstring(section0)
    fill_all_evaluation_tables_lxml(root, evaluation, image_catalog=catalog)
    _strip_all_linesegarray(root)
    return Section0BuildResult(
        section0=_serialize_section0_root(root),
        image_catalog=catalog,
    )


def _hp_t_needle(old_text: str) -> bytes:
    return b">" + _encode_t_inner(old_text) + HP_T_CLOSE


def _split_lines(value: str) -> list[str]:
    text = sanitize_hwpx_text(value) or " "
    lines = [ln for ln in text.split("\n") if ln.strip()]
    return lines if lines else [" "]


def _apply_patches(raw: bytes, patches: list[_BytePatch], *, unique_only: bool = False) -> bytes:
    """hp:t / PrvText 바이트 치환. section0는 문서 순서대로(중복 텍스트 대응)."""
    out = raw
    if unique_only:
        for patch in sorted(patches, key=lambda p: len(p.old), reverse=True):
            if patch.old == patch.new or not patch.old:
                continue
            if out.count(patch.old) != 1:
                continue
            out = out.replace(patch.old, patch.new, 1)
        return out

    pos = 0
    for patch in patches:
        if patch.old == patch.new or not patch.old:
            continue
        idx = out.find(patch.old, pos)
        if idx < 0:
            continue
        out = out[:idx] + patch.new + out[idx + len(patch.old) :]
        pos = idx + len(patch.new)
    return out


def _cell_t_patches(tc: etree._Element, value: str) -> list[_BytePatch]:
    t_nodes = tc.findall(f".//{{{HP_NS}}}t")
    if not t_nodes:
        return []

    padded = _cell_t_lines(tc, value)
    patches: list[_BytePatch] = []
    for node, line in zip(t_nodes, padded):
        old = node.text or " "
        new = sanitize_hwpx_text(line) or " "
        if old == new:
            continue
        old_inner = _encode_t_inner(old)
        new_inner = _fit_utf8_bytes(_encode_t_inner(new), len(old_inner))
        patches.append(
            _BytePatch(
                old=_hp_t_needle(old),
                new=b">" + new_inner + HP_T_CLOSE,
            )
        )
    return patches


def _prv_tag_patch(prv: bytes, tag: str, old_inner: str, new_inner: str) -> _BytePatch | None:
    old_b = f"<{tag}><{old_inner}>".encode("utf-8")
    if prv.count(old_b) != 1:
        return None
    prefix = f"<{tag}><".encode("utf-8")
    suffix = b">"
    inner_len = len(old_b) - len(prefix) - len(suffix)
    val_b = _fit_utf8_bytes(
        (sanitize_hwpx_text(new_inner) or " ").encode("utf-8"),
        inner_len,
    )
    new_b = prefix + val_b + suffix
    if old_b == new_b:
        return None
    return _BytePatch(old=old_b, new=new_b)


def _prv_goals_join(parts: list[str], prv: bytes) -> str:
    """PrvText 목표 필드는 section0 3줄을 공백으로 이어 붙인 형태."""
    if not parts:
        return ""
    joined = "".join(parts)
    if f"<목 표><{joined}>".encode("utf-8") in prv:
        return joined
    spaced = " ".join(parts)
    if f"<목 표><{spaced}>".encode("utf-8") in prv:
        return spaced
    return spaced


def _resolve_field_value(
    data: dict[str, Any],
    field_key: str,
    *,
    formatters: dict[str, Callable[[dict[str, Any]], str]] | None = None,
) -> str:
    if formatters and field_key in formatters:
        return formatters[field_key](data)
    raw = data.get(field_key)
    if field_key == "goals" and isinstance(raw, list):
        return _goals_text_plain(raw)
    if field_key in (
        "purpose",
        "performanceIndicator",
        "evaluationTool",
        "keyFactorAnalysis",
        "goalAppropriacy",
        "suggestion",
        "supervision",
    ):
        from app.application.hwpx.encoding import slot_lines

        return slot_lines(str(raw or "")) or "-"
    if field_key == "evaluationDate":
        from app.application.hwpx.render.evaluation_table_ops import _format_eval_date

        return _format_eval_date(str(raw or ""))
    return str(raw or "")


_PLAN_PRV_TAGS: dict[str, str] = {
    "projectName": "사 업 명",
    "purpose": "목 적",
    "goals": "목 표",
    "period": "사 업 기 간",
    "target": "사 업 대 상",
    "totalCount": "연 인 원 수 / 횟 수",
    "budget": "소 요 예 산",
    "budgetCategory": "예 산 과 목",
    "manager": "담 당",
}


def build_plan_byte_patches(
    form: dict[str, Any],
    *,
    section0: bytes,
    prv: bytes,
) -> list[_BytePatch]:
    root = etree.fromstring(section0)
    table_paras = _direct_table_paragraphs(root)
    if not table_paras:
        return []
    main_tbl = table_paras[0].find(f".//{{{HP_NS}}}tbl")
    if main_tbl is None:
        return []

    cells = _cells_by_addr(main_tbl)
    patches: list[_BytePatch] = []

    for (row, col), field_key in PLAN_MAIN_TABLE_VALUES.items():
        tc = cells.get((row, col))
        if tc is None or not tc.findall(f".//{{{HP_NS}}}t"):
            continue
        value = _resolve_field_value(
            form,
            field_key,
            formatters={"purpose": plan_purpose_text},
        )

        if field_key == "goals":
            patches.extend(_cell_t_patches(tc, value))
            continue

        patches.extend(_cell_t_patches(tc, value))

    sub_projects = form.get("subProjects") or []
    for idx, row_addr in enumerate(PLAN_SUBPROJECT_ROWS):
        if idx >= len(sub_projects):
            break
        proj = sub_projects[idx] or {}
        name_tc = cells.get((row_addr, 0))
        value_tc = cells.get((row_addr, 2))
        name_new = str(proj.get("name") or "")
        body_src = ""
        if value_tc is not None:
            body_src = "\n".join(
                x
                for x in (
                    str(proj.get("output") or "").strip(),
                    str(proj.get("outcome") or "").strip(),
                )
                if x
            )
        if name_tc is not None:
            patches.extend(_cell_t_patches(name_tc, name_new))
        if value_tc is not None:
            patches.extend(_cell_t_patches(value_tc, body_src or "-"))

    return patches


def build_evaluation_byte_patches(
    evaluation: dict[str, Any],
    *,
    section0: bytes,
    prv: bytes,
) -> list[_BytePatch]:
    root = etree.fromstring(section0)
    table_paras = _direct_table_paragraphs(root)
    if not table_paras:
        return []
    main_tbl = table_paras[0].find(f".//{{{HP_NS}}}tbl")
    if main_tbl is None:
        return []

    cells = _cells_by_addr(main_tbl)
    patches: list[_BytePatch] = []

    for (row, col), field_key in EVALUATION_MAIN_TABLE_VALUES.items():
        tc = cells.get((row, col))
        if tc is None or not tc.findall(f".//{{{HP_NS}}}t"):
            continue
        value = _resolve_field_value(evaluation, field_key)
        patches.extend(_cell_t_patches(tc, value))

    return patches


def fill_template_package_bytes(
    doc: HwpxDocument,
    *,
    section0: bytes,
    prv: bytes,
) -> tuple[bytes, bytes]:
    """section0·PrvText 동시 패치 (템플릿 바이트 기반)."""
    kind = doc.template_kind
    fill = doc.template_fill or {}

    if kind == "plan":
        form = fill.get("form_data") or {}
        sections = fill.get("sections") or []
        built = build_plan_section0_for_download(
            section0, form, sections=sections
        )
        section0_out = built.section0
        prv_out = rebuild_plan_prv_bytes(prv, form, sections=sections)
    elif kind == "evaluation":
        evaluation = fill.get("evaluation") or {}
        built = build_evaluation_section0_for_download(section0, evaluation)
        section0_out = built.section0
        prv_out = rebuild_evaluation_prv_bytes(prv, evaluation)
    else:
        return section0, prv

    return section0_out, prv_out


def build_section0_bytes_byte_fill(doc: HwpxDocument) -> bytes:
    section0, _ = fill_template_package_bytes(
        doc,
        section0=load_section0_template_bytes(doc.template_kind or "empty"),
        prv=b"",
    )
    return section0
