"""연간 사업보고서(전자책자) → 한 권의 PDF 렌더.

연도별 `{연도}_사업보고서` 책자의 entries(사업별)를 순회하며, 완료된
사업계획서·만족도조사 결과·사업평가 내용을 실제 PDF 페이지로 누적해 렌더한다.
전자책자처럼 뷰어에서 이 PDF를 열어 본다.
"""

from __future__ import annotations

import base64
import io
import logging
import random
import re
from typing import TYPE_CHECKING, Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.application.hwpx.document_sections import (
    hwpx_sections_from_document_sections,
)
from app.application.hwpx.models import HwpxTable
from app.application.survey_results_pdf import (
    ensure_korean_font,
    key_value_table,
    make_styles,
    survey_results_flowables,
)
from app.core.datetime_kst import format_kst_datetime

if TYPE_CHECKING:
    from app.application.services.region_store_service import RegionStoreService

_log = logging.getLogger(__name__)


def _safe_filename(name: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|\n\r\t]+', "_", str(name or "").strip())
    cleaned = cleaned.strip("._ ") or "사업보고서"
    return f"{cleaned}.pdf"


def _p(text: Any, style) -> Paragraph:
    """줄바꿈 보존 + XML 이스케이프 문단."""
    raw = "" if text is None else str(text)
    return Paragraph(escape(raw).replace("\n", "<br/>"), style)


def _kv_rows(pairs: list[tuple[str, Any]]) -> list[list[str]]:
    """값이 있는 (라벨, 값)만 2열 표 행으로."""
    rows: list[list[str]] = []
    for label, value in pairs:
        text = "" if value is None else str(value).strip()
        if text:
            rows.append([label, text])
    return rows


def _bullets(values: Any, style) -> list:
    flow: list = []
    if isinstance(values, list):
        for item in values:
            text = str(item or "").strip()
            if text:
                flow.append(_p(f"· {text}", style))
    return flow


def _long_fields(pairs: list[tuple[str, Any]], styles: dict) -> list:
    """제목 + 본문(긴 텍스트) 블록들."""
    flow: list = []
    for label, value in pairs:
        text = "" if value is None else str(value).strip()
        if text:
            flow.append(_p(label, styles["q"]))
            flow.append(_p(text, styles["body"]))
    return flow


_TABLE_MAX_WIDTH = 170 * mm


def _hwpx_table_to_flow(table: HwpxTable, styles: dict, font: str) -> Table | None:
    """HwpxTable → reportlab Table (셀 텍스트 래핑 + 헤더 음영)."""
    if not table.rows:
        return None
    grid = [[_p(cell.text, styles["cell"]) for cell in row] for row in table.rows]
    ncols = max((len(row) for row in grid), default=0)
    if ncols == 0:
        return None
    for row in grid:  # 행마다 열 수를 최대 열 수로 맞춰 정렬 깨짐 방지
        while len(row) < ncols:
            row.append(_p("", styles["cell"]))
    tbl = Table(grid, colWidths=[_TABLE_MAX_WIDTH / ncols] * ncols, hAlign="LEFT")
    has_header = bool(table.rows[0]) and any(cell.header for cell in table.rows[0])
    style = [
        ("FONTNAME", (0, 0), (-1, -1), font),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    if has_header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")))
    tbl.setStyle(TableStyle(style))
    return tbl


def _document_sections_flow(
    sections: Any,
    form_data: dict | None,
    styles: dict,
    font: str,
) -> list:
    """추가 본문 섹션(리치텍스트 HTML·표·preset)을 렌더.

    HWPX 내보내기와 동일한 파서(`hwpx_sections_from_document_sections`)로 HTML/preset 을
    구조화한 뒤 reportlab flowable 로 변환한다 — raw HTML 태그나 `{"preset":...}` JSON 이
    그대로 노출되던 문제 해결.
    """
    flow: list = []
    if not isinstance(sections, list) or not sections:
        return flow
    normalized = [s for s in sections if isinstance(s, dict)]
    try:
        hwpx_sections = hwpx_sections_from_document_sections(
            normalized, form_data=form_data
        )
    except Exception:
        _log.debug("연간보고서 섹션 변환 실패", exc_info=True)
        return flow
    for section in hwpx_sections:
        for para in section.paragraphs:
            variant = getattr(para, "variant", "body")
            style = styles["q"] if variant in ("title", "heading") else styles["body"]
            flow.append(_p(para.text, style))
        for table in section.tables:
            tbl = _hwpx_table_to_flow(table, styles, font)
            if tbl is not None:
                flow.append(tbl)
    return flow


def _plan_flow(plan: dict, styles: dict, font: str) -> list:
    form = plan.get("formData") or {}
    flow: list = []
    rows = _kv_rows(
        [
            ("사업명", form.get("projectName")),
            ("담당자", form.get("manager")),
            ("사업기간", form.get("period")),
            ("사업대상", form.get("target")),
            ("총 횟수", form.get("totalCount")),
            ("예산", form.get("budget")),
            ("예산과목", form.get("budgetCategory")),
        ]
    )
    if rows:
        flow.append(key_value_table(rows, font))
    flow.extend(_long_fields([("사업목적", form.get("purpose"))], styles))
    goals = _bullets(form.get("goals"), styles["body"])
    if goals:
        flow.append(_p("목표", styles["q"]))
        flow.extend(goals)

    sub_projects = form.get("subProjects")
    if isinstance(sub_projects, list) and sub_projects:
        flow.append(_p("단위사업", styles["q"]))
        table_rows: list[list[str]] = [["단위사업", "산출목표", "성과목표"]]
        for sp in sub_projects:
            if not isinstance(sp, dict):
                continue
            table_rows.append(
                [
                    str(sp.get("name") or ""),
                    str(sp.get("output") or ""),
                    str(sp.get("outcome") or ""),
                ]
            )
        if len(table_rows) > 1:
            flow.append(_basic_table(table_rows, font))

    flow.extend(_document_sections_flow(plan.get("sections"), form, styles, font))
    if not flow:
        flow.append(_p("작성된 사업계획 내용이 없습니다.", styles["qsub"]))
    return flow


def _eval_flow(ev: dict, styles: dict, font: str) -> list:
    flow: list = []
    rows = _kv_rows(
        [
            ("사업명", ev.get("programName")),
            ("부서", ev.get("team")),
            ("담당자", ev.get("manager")),
            ("사업기간", ev.get("period")),
            ("사업대상", ev.get("target")),
            ("계획 횟수", ev.get("planCount")),
            ("계획 예산", ev.get("planBudget")),
            ("실적 횟수", ev.get("actualCount")),
            ("집행액", ev.get("actualExpense")),
            ("평가일", ev.get("evaluationDate")),
        ]
    )
    if rows:
        flow.append(key_value_table(rows, font))

    flow.extend(_long_fields([("사업목적", ev.get("purpose"))], styles))
    goals = _bullets(ev.get("goals"), styles["body"])
    if goals:
        flow.append(_p("목표", styles["q"]))
        flow.extend(goals)

    detail_rows = ev.get("detailRows")
    if isinstance(detail_rows, list):
        kv = _kv_rows(
            [(str(r.get("label") or ""), r.get("content")) for r in detail_rows if isinstance(r, dict)]
        )
        if kv:
            flow.append(key_value_table(kv, font, label_width=40 * mm))

    flow.extend(
        _long_fields(
            [
                ("성과지표", ev.get("performanceIndicator")),
                ("평가도구", ev.get("evaluationTool")),
                ("주요 요인 분석", ev.get("keyFactorAnalysis")),
                ("목표 적정성", ev.get("goalAppropriacy")),
                ("제언", ev.get("suggestion")),
                ("지도·점검", ev.get("supervision")),
            ],
            styles,
        )
    )
    flow.extend(
        _document_sections_flow(ev.get("sections"), ev.get("formData"), styles, font)
    )
    if not flow:
        flow.append(_p("작성된 사업평가 내용이 없습니다.", styles["qsub"]))
    return flow


def _basic_table(rows: list[list[str]], font: str) -> Table:
    tbl = Table(rows, hAlign="LEFT")
    tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), font),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return tbl


# ── 표지(1p) ───────────────────────────────────────────────────────────
_COVER_PALETTES = (
    ("#1a2744", "#2d4a7c", "#6b8cce"),
    ("#143d2b", "#1f6b47", "#5cbd8a"),
    ("#3a1a44", "#6b2d7c", "#b06bce"),
    ("#44321a", "#7c592d", "#ceaa6b"),
    ("#102a44", "#1f5f7c", "#5cbcce"),
    ("#401a1a", "#7c2d2d", "#ce6b6b"),
)

_DEFAULT_INTRO = (
    "본 보고서는 해당 연도에 수행한 사업의 계획·실적·만족도조사·평가 결과를 사업별로 "
    "정리한 종합 사업보고서입니다. 각 사업의 추진 내용과 성과를 한눈에 확인할 수 있도록 "
    "구성하였습니다."
)


def _decode_cover_image(book: dict) -> bytes | None:
    """책자에 지정된 표지 이미지(data URI 또는 base64) → bytes. 없으면 None."""
    raw = book.get("coverImage") or book.get("coverImageDataUri")
    if not raw or not isinstance(raw, str):
        return None
    try:
        if raw.startswith("data:"):
            raw = raw.split(",", 1)[1]
        return base64.b64decode(raw)
    except Exception:
        return None


def _draw_random_cover_bg(canvas, w: float, h: float, palette, rng) -> None:
    """지정 이미지가 없을 때 제목 기반 랜덤 추상 표지 배경."""
    canvas.setFillColor(colors.HexColor(palette[0]))
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    shades = [colors.HexColor(palette[1]), colors.HexColor(palette[2])]
    for _ in range(8):
        canvas.setFillColor(rng.choice(shades))
        canvas.setFillAlpha(rng.uniform(0.10, 0.28))
        canvas.circle(
            rng.uniform(0, w),
            rng.uniform(h * 0.5, h),
            rng.uniform(35, 130) * mm,
            fill=1,
            stroke=0,
        )
    canvas.setFillAlpha(0.92)
    canvas.setFillColor(colors.HexColor(palette[1]))
    canvas.rect(0, 0, w, 22 * mm, fill=1, stroke=0)
    canvas.setFillAlpha(1)


def _make_cover_drawer(book: dict, title: str, font: str):
    """1페이지 표지를 캔버스에 직접 그리는 onFirstPage 콜백.

    `coverImage`(data URI/base64) 가 있으면 전면 이미지, 없으면 제목으로 시드된
    랜덤 추상 표지를 그린다(같은 책자는 항상 같은 표지).
    """
    image_bytes = _decode_cover_image(book)
    rng = random.Random(sum(ord(c) for c in (title or "report")) or 1)
    palette = rng.choice(_COVER_PALETTES)
    subtitle = (book.get("team") or "") + (
        f"   ·   {book.get('year')}년" if book.get("year") else ""
    )
    generated = f"생성일: {format_kst_datetime()}"

    def draw(canvas, doc) -> None:
        w, h = doc.pagesize
        canvas.saveState()
        drew_image = False
        if image_bytes:
            try:
                canvas.drawImage(
                    ImageReader(io.BytesIO(image_bytes)),
                    0, 0, width=w, height=h,
                    preserveAspectRatio=True, anchor="c", mask="auto",
                )
                drew_image = True
            except Exception:
                drew_image = False
        if not drew_image:
            _draw_random_cover_bg(canvas, w, h, palette, rng)

        band_h = 66 * mm  # 제목 가독성용 반투명 흰 밴드
        band_y = h * 0.52 - band_h / 2
        canvas.setFillColor(colors.HexColor("#ffffff"))
        canvas.setFillAlpha(0.84)
        canvas.rect(0, band_y, w, band_h, fill=1, stroke=0)
        canvas.setFillAlpha(1)

        canvas.setFillColor(colors.HexColor("#1a2744"))
        canvas.setFont(font, 30)
        canvas.drawCentredString(w / 2, band_y + band_h - 30 * mm, title)
        canvas.setFillColor(colors.HexColor("#475569"))
        if subtitle.strip():
            canvas.setFont(font, 13)
            canvas.drawCentredString(w / 2, band_y + band_h - 44 * mm, subtitle)
        canvas.setFont(font, 10)
        canvas.drawCentredString(w / 2, band_y + 9 * mm, generated)
        canvas.restoreState()

    return draw


def _page_footer(canvas, doc) -> None:
    """2페이지부터 하단 가운데 쪽번호."""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#94a3b8"))
    canvas.drawCentredString(doc.pagesize[0] / 2, 8 * mm, str(canvas.getPageNumber()))
    canvas.restoreState()


# ── 조직현황(4p~) ──────────────────────────────────────────────────────
def _employee_table(employees: list, styles: dict, font: str) -> Table | None:
    rows = [r for r in (employees or []) if isinstance(r, dict)]
    if not rows:
        return None
    grid_data = [["이름", "직위", "역할", "이메일"]]
    for emp in rows:
        grid_data.append([
            str(emp.get("name") or ""),
            str(emp.get("position") or ""),
            str(emp.get("role") or ""),
            str(emp.get("email") or ""),
        ])
    grid = [[_p(c, styles["cell"]) for c in row] for row in grid_data]
    tbl = Table(grid, colWidths=[35 * mm, 35 * mm, 45 * mm, 55 * mm], hAlign="LEFT")
    tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return tbl


def _org_flow(org_data: dict | None, styles: dict, font: str) -> list:
    flow: list = []
    if not isinstance(org_data, dict):
        flow.append(_p("조직 정보를 불러오지 못했습니다.", styles["qsub"]))
        return flow
    departments = [d for d in (org_data.get("departments") or []) if isinstance(d, dict)]
    if not departments:
        tbl = _employee_table(org_data.get("employees") or [], styles, font)
        flow.append(tbl if tbl is not None else _p("등록된 조직 정보가 없습니다.", styles["qsub"]))
        return flow
    for dept in departments:
        name = str(dept.get("name") or "부서")
        count = dept.get("count")
        flow.append(_p(
            name + (f" ({count}명)" if isinstance(count, int) else ""), styles["q"]
        ))
        tbl = _employee_table(dept.get("employees") or [], styles, font)
        flow.append(tbl if tbl is not None else _p("소속 직원이 없습니다.", styles["qsub"]))
    return flow


# ── 실적관리 ───────────────────────────────────────────────────────────
def _num(value: Any) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _performance_flow(rows: list, styles: dict, font: str) -> list:
    """실적관리(입력관리) 행 → 계획/실적 인원·횟수 표(합계 포함)."""
    flow: list = []
    data_rows = [r for r in (rows or []) if isinstance(r, dict)]
    if not data_rows:
        flow.append(_p("실적관리 데이터가 없습니다.", styles["qsub"]))
        return flow
    grid_data = [["세부사업", "월", "계획인원", "계획횟수", "실적인원", "실적횟수"]]
    tot = {"pp": 0, "pc": 0, "ap": 0, "ac": 0}
    for r in data_rows:
        pp, pc = _num(r.get("planPeople")), _num(r.get("planCount"))
        ap, ac = _num(r.get("actualPeople")), _num(r.get("actualCount"))
        tot["pp"] += pp
        tot["pc"] += pc
        tot["ap"] += ap
        tot["ac"] += ac
        grid_data.append([
            str(r.get("subProject") or ""),
            str(r.get("month") or ""),
            f"{pp:,}", f"{pc:,}", f"{ap:,}", f"{ac:,}",
        ])
    grid_data.append([
        "합계", "", f"{tot['pp']:,}", f"{tot['pc']:,}", f"{tot['ap']:,}", f"{tot['ac']:,}",
    ])
    grid = [[_p(c, styles["cell"]) for c in row] for row in grid_data]
    tbl = Table(
        grid,
        colWidths=[45 * mm, 15 * mm, 25 * mm, 25 * mm, 25 * mm, 25 * mm],
        hAlign="LEFT",
    )
    last = len(grid) - 1
    tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("BACKGROUND", (0, last), (-1, last), colors.HexColor("#f1f5f9")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    flow.append(tbl)
    return flow


def build_annual_report_pdf(
    service: RegionStoreService,
    region_id: str,
    book: dict,
    *,
    org_data: dict | None = None,
) -> tuple[bytes, str]:
    """책자(연간 보고서) 한 권을 PDF 바이트로 렌더한다.

    구성: 표지(1p) → 목차(2p) → 사업 개요(3p) → 조직현황(4p~) → 사업별 본문
    (사업계획서 → 실적관리 → 만족도조사 → 사업평가).
    """
    font = ensure_korean_font()
    styles = make_styles(font)

    title = book.get("title") or "사업보고서"
    entries = [e for e in (book.get("entries") or []) if isinstance(e, dict)]

    # 1p 표지는 onFirstPage 캔버스로 그린다 → 본문 흐름은 2페이지부터.
    flow: list = [Spacer(1, 1), PageBreak()]

    # 2p 목차
    flow.append(_p("목차", styles["h2"]))
    if entries:
        for index, entry in enumerate(entries, start=1):
            flow.append(
                _p(f"{index}. {entry.get('programName') or '이름 없는 사업'}", styles["body"])
            )
    else:
        flow.append(
            _p(
                "아직 기입된 사업이 없습니다. 사업관리에서 사업계획·만족도조사·사업평가를 "
                "완료하면 이 보고서에 자동으로 추가됩니다.",
                styles["body"],
            )
        )
    flow.append(PageBreak())

    # 3p 사업 개요/인사말
    flow.append(_p("사업 개요", styles["h2"]))
    intro = str(book.get("intro") or "").strip() or _DEFAULT_INTRO
    flow.append(_p(intro, styles["body"]))
    flow.append(PageBreak())

    # 4p~ 조직현황
    flow.append(_p("조직현황", styles["h2"]))
    flow.extend(_org_flow(org_data, styles, font))

    for index, entry in enumerate(entries, start=1):
        flow.append(PageBreak())
        program = entry.get("programName") or "이름 없는 사업"
        flow.append(_p(f"{index}. {program}", styles["h2"]))
        task_id = str(entry.get("taskId") or "")

        if entry.get("plan"):
            flow.append(_p("사업계획서", styles["h3"]))
            try:
                plan = service.get_business_plan(region_id, task_id)
                flow.extend(_plan_flow(plan, styles, font))
            except Exception:
                _log.debug("연간보고서 사업계획 렌더 실패 task=%s", task_id, exc_info=True)
                flow.append(_p("사업계획 내용을 불러오지 못했습니다.", styles["qsub"]))

        # 실적관리 (사업계획서 → 실적관리 → 만족도조사 → 사업평가 세트)
        flow.append(_p("실적관리", styles["h3"]))
        if task_id:
            try:
                perf_rows = service.get_input_management_rows(
                    region_id, task_id, task_title=program
                )
                flow.extend(_performance_flow(perf_rows, styles, font))
            except Exception:
                _log.debug("연간보고서 실적관리 렌더 실패 task=%s", task_id, exc_info=True)
                flow.append(_p("실적관리 내용을 불러오지 못했습니다.", styles["qsub"]))
        else:
            flow.append(_p("실적관리 데이터가 없습니다.", styles["qsub"]))

        if entry.get("survey"):
            flow.append(_p("만족도조사 결과", styles["h3"]))
            try:
                metas = service.list_task_surveys(region_id, task_id)
            except Exception:
                metas = []
            rendered_any = False
            seen_survey_ids: set[str] = set()
            for meta in metas:
                survey_id = meta.get("id")
                if not survey_id:
                    continue
                sid = str(survey_id)
                if sid in seen_survey_ids:  # 같은 설문 중복 기입 방지
                    continue
                seen_survey_ids.add(sid)
                try:
                    results = service.get_survey_results(region_id, sid)
                except Exception:
                    continue
                flow.append(_p(meta.get("title") or "만족도조사", styles["q"]))
                flow.extend(survey_results_flowables(results, styles, font))
                rendered_any = True
            if not rendered_any:
                flow.append(_p("만족도조사 결과 데이터가 없습니다.", styles["qsub"]))

        if entry.get("evaluation"):
            flow.append(_p("사업평가", styles["h3"]))
            try:
                ev = service.get_business_evaluation(region_id, task_id)
                flow.extend(_eval_flow(ev, styles, font))
            except Exception:
                _log.debug("연간보고서 사업평가 렌더 실패 task=%s", task_id, exc_info=True)
                flow.append(_p("사업평가 내용을 불러오지 못했습니다.", styles["qsub"]))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        title=title,
    )
    doc.build(
        flow,
        onFirstPage=_make_cover_drawer(book, title, font),
        onLaterPages=_page_footer,
    )
    return buffer.getvalue(), _safe_filename(title)
