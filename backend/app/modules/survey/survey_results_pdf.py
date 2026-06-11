"""만족도조사 결과 → PDF 보고서 (reportlab).

업무(사업) 만족도조사 완료 시 결과를 PDF 로 만들어 파일관리에 첨부한다.
한글 렌더링을 위해 번들된 NotoSansKR TTF 를 등록한다(없으면 시스템 폰트 폴백).
"""

from __future__ import annotations

import io
import logging
import os
import re
from pathlib import Path
from typing import Any

from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

_log = logging.getLogger(__name__)

_FONT_NAME = "KRSans"
_FONT_REGISTERED: bool | None = None

# 번들 폰트(백엔드 이미지에 항상 포함) → 시스템 한글 폰트 순으로 탐색
_BUNDLED_FONT = (
    Path(__file__).resolve().parent / "assets" / "fonts" / "NotoSansKR-ExtraLight.ttf"
)


def _repo_rhwp_font() -> str | None:
    """개발 환경(repo 루트에 rhwp 체크아웃)의 NotoSansKR 폰트 후보.

    조상 디렉터리를 따라 올라가며 rhwp/ttfs/opensource 폰트를 찾는다.
    경로 깊이가 얕은 배포 환경(예: 컨테이너 /app/...)에서도 안전하도록
    인덱스 접근(parents[N])이 아닌 순회로 탐색한다. 없으면 None.
    """
    for parent in Path(__file__).resolve().parents:
        candidate = (
            parent / "rhwp" / "ttfs" / "opensource" / "NotoSansKR-ExtraLight.ttf"
        )
        if candidate.is_file():
            return str(candidate)
    return None


_FONT_CANDIDATES = (
    os.environ.get("SURVEY_PDF_FONT_PATH"),
    str(_BUNDLED_FONT),
    # repo 내 rhwp 폰트(개발 환경, 없으면 None)
    _repo_rhwp_font(),
    r"C:\Windows\Fonts\malgun.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
)

_TOP_BUCKETS = ("매우불만족", "불만족", "보통", "만족", "매우만족")

# 결과지(survey-results.tsx)와 동일 계열 색상 — 차트 시각화에 사용
_SCALE_BAR_COLOR = colors.HexColor("#3b82f6")
_MATRIX_COLORS = {
    "매우불만족": colors.HexColor("#4338ca"),
    "불만족": colors.HexColor("#5b73d6"),
    "보통": colors.HexColor("#3b82f6"),
    "만족": colors.HexColor("#22a06b"),
    "매우만족": colors.HexColor("#4ade80"),
}
# choice 파이 색상 — pieData 에 color 가 없을 때 폴백(결과지 기본 팔레트)
_PIE_FALLBACK_COLORS = (
    "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
    "#8b5cf6", "#64748b", "#0ea5e9", "#ec4899",
)
# A4(폭 210mm) − 좌우 margin 18mm = 본문 폭 174mm 안에 들어가는 차트 폭
_CHART_WIDTH = 168 * mm
_MUTED = colors.HexColor("#64748b")


def _num(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _hex_color(value: Any, fallback: str):
    try:
        return colors.HexColor(value) if value else colors.HexColor(fallback)
    except (ValueError, AttributeError):
        return colors.HexColor(fallback)


def _scale_chart(question: dict, font: str) -> Drawing | None:
    """척도(1~5점) 문항 → 점수별 응답 수 막대 차트(결과지와 동일)."""
    points = question.get("scaleData") or []
    if not points:
        return None
    counts = {int(_num(p.get("score"))): _num(p.get("count", 0)) for p in points}
    if not any(counts.values()):
        return None

    height = 56 * mm
    d = Drawing(_CHART_WIDTH, height)
    bc = VerticalBarChart()
    bc.x = 24
    bc.y = 16
    bc.width = _CHART_WIDTH - 40
    bc.height = height - 28
    bc.data = [[counts.get(s, 0) for s in range(1, 6)]]
    bc.categoryAxis.categoryNames = ["1점", "2점", "3점", "4점", "5점"]
    bc.categoryAxis.labels.fontName = font
    bc.categoryAxis.labels.fontSize = 8.5
    bc.valueAxis.valueMin = 0
    bc.valueAxis.labels.fontName = font
    bc.valueAxis.labels.fontSize = 8
    bc.bars[0].fillColor = _SCALE_BAR_COLOR
    bc.bars[0].strokeColor = None
    bc.barWidth = 14
    bc.barLabels.fontName = font
    bc.barLabels.fontSize = 8.5
    bc.barLabels.boxAnchor = "s"
    bc.barLabels.dy = 2
    bc.barLabelFormat = "%d"
    d.add(bc)
    return d


def _matrix_chart(question: dict, font: str) -> Drawing | None:
    """표형(매트릭스) 문항 → 항목별 5점 분포 그룹 막대 차트 + 범례."""
    rows = question.get("matrixChart") or []
    if not rows:
        return None

    names = [str(r.get("name", "")) for r in rows]
    series = [[_num(r.get(bucket, 0)) for r in rows] for bucket in _TOP_BUCKETS]

    legend_h = 7 * mm
    chart_h = 58 * mm
    height = chart_h + legend_h
    d = Drawing(_CHART_WIDTH, height)

    bc = VerticalBarChart()
    bc.x = 24
    bc.y = legend_h + 14
    bc.width = _CHART_WIDTH - 44
    bc.height = chart_h - 26
    bc.data = series
    bc.categoryAxis.categoryNames = names
    bc.categoryAxis.labels.fontName = font
    bc.categoryAxis.labels.fontSize = 8.5
    bc.valueAxis.valueMin = 0
    bc.valueAxis.labels.fontName = font
    bc.valueAxis.labels.fontSize = 8
    bc.groupSpacing = 14
    bc.barSpacing = 0.5
    for index, bucket in enumerate(_TOP_BUCKETS):
        bc.bars[index].fillColor = _MATRIX_COLORS[bucket]
        bc.bars[index].strokeColor = None
    d.add(bc)

    # 막대 색상 범례(가로 한 줄)
    swatch = 3.0 * mm
    size = 8.0
    gap = 7 * mm
    widths = [
        swatch + 1.6 * mm + pdfmetrics.stringWidth(b, font, size) + gap
        for b in _TOP_BUCKETS
    ]
    x = max(24.0, (_CHART_WIDTH - sum(widths)) / 2)
    y = 1.5 * mm
    for bucket, width in zip(_TOP_BUCKETS, widths):
        d.add(Rect(x, y, swatch, swatch, fillColor=_MATRIX_COLORS[bucket], strokeColor=None))
        d.add(String(x + swatch + 1.6 * mm, y, bucket, fontName=font, fontSize=size))
        x += width
    return d


def _choice_chart(question: dict, font: str) -> Drawing | None:
    """객관식(choice) 문항 → 도넛형 파이 + 항목·응답수·비율 범례(결과지와 동일)."""
    raw = question.get("pieData") or []
    if not raw:
        return None

    entries = []
    for index, item in enumerate(raw):
        fallback = _PIE_FALLBACK_COLORS[index % len(_PIE_FALLBACK_COLORS)]
        entries.append((item, _hex_color(item.get("color"), fallback)))
    total = sum(_num(item.get("value", 0)) for item, _ in entries)

    row_h = 6.4 * mm
    pie_size = 42 * mm
    height = max(pie_size + 4 * mm, row_h * len(entries) + 5 * mm)
    d = Drawing(_CHART_WIDTH, height)

    nonzero = [(item, col) for item, col in entries if _num(item.get("value", 0)) > 0]
    if nonzero:
        pie = Pie()
        pie.width = pie_size
        pie.height = pie_size
        pie.x = 6
        pie.y = (height - pie_size) / 2
        pie.data = [_num(item.get("value", 0)) for item, _ in nonzero]
        pie.innerRadiusFraction = 0.55
        pie.slices.strokeColor = colors.white
        pie.slices.strokeWidth = 0.75
        for index, (_, col) in enumerate(nonzero):
            pie.slices[index].fillColor = col
        d.add(pie)

    legend_x = pie_size + 16 * mm
    swatch = 3.2 * mm
    top = height - 3 * mm
    for index, (item, col) in enumerate(entries):
        y = top - (index + 1) * row_h
        value = _num(item.get("value", 0))
        pct = f" ({round(value / total * 100)}%)" if total > 0 else ""
        d.add(Rect(legend_x, y, swatch, swatch, fillColor=col, strokeColor=None))
        d.add(
            String(
                legend_x + swatch + 3 * mm,
                y,
                str(item.get("name", "")),
                fontName=font,
                fontSize=9,
            )
        )
        d.add(
            String(
                _CHART_WIDTH - 4 * mm,
                y,
                f"{int(value) if value == int(value) else value}{pct}",
                fontName=font,
                fontSize=9,
                textAnchor="end",
                fillColor=_MUTED,
            )
        )
    return d


def _ensure_font() -> str:
    """한글 폰트를 한 번만 등록하고 폰트명을 돌려준다. 실패 시 Helvetica."""
    global _FONT_REGISTERED
    if _FONT_REGISTERED is True:
        return _FONT_NAME
    if _FONT_REGISTERED is False:
        return "Helvetica"

    for candidate in _FONT_CANDIDATES:
        if not candidate:
            continue
        try:
            if not Path(candidate).is_file():
                continue
            pdfmetrics.registerFont(TTFont(_FONT_NAME, candidate))
            _FONT_REGISTERED = True
            return _FONT_NAME
        except Exception:
            _log.debug("PDF 폰트 등록 실패: %s", candidate, exc_info=True)

    _log.warning("한글 PDF 폰트를 찾지 못해 Helvetica 로 대체합니다(한글 깨짐 가능).")
    _FONT_REGISTERED = False
    return "Helvetica"


def _safe_filename(name: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|\n\r\t]+', "_", str(name or "").strip())
    cleaned = cleaned.strip("._ ") or "만족도조사_결과"
    return f"{cleaned}.pdf"


def _styles(font: str) -> dict[str, ParagraphStyle]:
    return {
        "title": ParagraphStyle(
            "title", fontName=font, fontSize=18, leading=24, spaceAfter=4
        ),
        "meta": ParagraphStyle(
            "meta", fontName=font, fontSize=9, leading=13, textColor=colors.HexColor("#64748b")
        ),
        "h2": ParagraphStyle(
            "h2", fontName=font, fontSize=13, leading=18, spaceBefore=10, spaceAfter=6,
            textColor=colors.HexColor("#1a2744"),
        ),
        "h3": ParagraphStyle(
            "h3", fontName=font, fontSize=11.5, leading=16, spaceBefore=8, spaceAfter=4,
            textColor=colors.HexColor("#1a2744"),
        ),
        "q": ParagraphStyle(
            "q", fontName=font, fontSize=11, leading=15, spaceBefore=8, spaceAfter=3,
        ),
        "qsub": ParagraphStyle(
            "qsub", fontName=font, fontSize=8.5, leading=12,
            textColor=colors.HexColor("#64748b"), spaceAfter=2,
        ),
        "cell": ParagraphStyle("cell", fontName=font, fontSize=9, leading=12),
        "body": ParagraphStyle("body", fontName=font, fontSize=9.5, leading=14),
    }


def _table(rows: list[list[Any]], font: str, *, col_widths=None) -> Table:
    tbl = Table(rows, colWidths=col_widths, hAlign="LEFT")
    tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), font),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return tbl


def _summary_flow(summary: dict, font: str) -> Table:
    def _avg(value: Any) -> str:
        try:
            return f"{float(value):.2f} / 5"
        except (TypeError, ValueError):
            return "-"

    rows = [
        ["총 응답", f"{summary.get('totalResponses', 0)}명",
         "응답 목표", f"{summary.get('totalTarget', 0)}명"],
        ["평균 만족도", _avg(summary.get("averageSatisfaction")),
         "완료율", f"{summary.get('completionRate', 0)}%"],
        ["긍정 응답률", f"{summary.get('positiveRate', 0)}%", "", ""],
    ]
    tbl = Table(rows, colWidths=[28 * mm, 40 * mm, 28 * mm, 40 * mm], hAlign="LEFT")
    tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), font),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f1f5f9")),
                ("SPAN", (1, 2), (3, 2)),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return tbl


def _question_flow(question: dict, styles: dict, font: str) -> list:
    """문항 1개를 결과지(차트)처럼 flowable 로 — 페이지 중간에서 끊기지 않게 묶는다."""
    flow: list = []
    title = question.get("title") or "(제목 없음)"
    flow.append(Paragraph(title, styles["q"]))
    answered = question.get("answeredCount", 0)
    skipped = question.get("skippedCount", 0)
    meta = f"응답 {answered} · 무응답 {skipped}"
    if question.get("average") is not None:
        meta += f" · 평균 {question.get('average')} / 5"
    flow.append(Paragraph(meta, styles["qsub"]))

    qtype = question.get("type")
    if qtype == "choice":
        chart = _choice_chart(question, font)
        if chart is not None:
            flow.append(chart)
        else:
            flow.append(Paragraph("응답 데이터가 없습니다.", styles["qsub"]))
    elif qtype == "scale":
        chart = _scale_chart(question, font)
        if chart is not None:
            flow.append(chart)
        else:
            flow.append(Paragraph("응답 데이터가 없습니다.", styles["qsub"]))
    elif qtype == "matrix":
        chart = _matrix_chart(question, font)
        if chart is not None:
            flow.append(chart)
        # 정확한 수치는 표로 함께 제공
        rows = [["항목", *_TOP_BUCKETS]]
        for row in question.get("matrixChart") or []:
            rows.append([str(row.get("name", ""))] + [str(row.get(b, 0)) for b in _TOP_BUCKETS])
        if len(rows) > 1:
            flow.append(Spacer(1, 2))
            flow.append(_table(rows, font))
        if chart is None and len(rows) <= 1:
            flow.append(Paragraph("응답 데이터가 없습니다.", styles["qsub"]))
    elif qtype == "text":
        texts = question.get("textResponses") or []
        for item in texts[:50]:
            flow.append(Paragraph(f"· {item.get('text', '')}", styles["body"]))
        if len(texts) > 50:
            flow.append(Paragraph(f"… 외 {len(texts) - 50}건", styles["qsub"]))
        if not texts:
            flow.append(Paragraph("주관식 응답이 없습니다.", styles["qsub"]))

    return [KeepTogether(flow)]


def build_survey_results_pdf(
    *,
    program_name: str,
    surveys: list[dict],
    generated_at: str,
) -> tuple[bytes, str]:
    """만족도조사 결과 PDF 바이트와 파일명을 돌려준다.

    surveys: [{"title": str, "endDate": str|None, "results": SurveyResults dict}]
    """
    font = _ensure_font()
    styles = _styles(font)

    flow: list = [
        Paragraph(f"{program_name} 만족도조사 결과 보고서", styles["title"]),
        Paragraph(f"생성일: {generated_at}", styles["meta"]),
        Spacer(1, 6),
    ]

    valid = [s for s in surveys if isinstance(s, dict)]
    if not valid:
        flow.append(Paragraph("등록된 설문 결과가 없습니다.", styles["body"]))

    for index, survey in enumerate(valid):
        if index > 0:
            flow.append(PageBreak())
        title = survey.get("title") or "만족도조사"
        flow.append(Paragraph(title, styles["h2"]))
        if survey.get("endDate"):
            flow.append(Paragraph(f"종료일: {survey['endDate']}", styles["qsub"]))
        results = survey.get("results") or {}
        summary = results.get("summary") or {}
        flow.append(_summary_flow(summary, font))
        flow.append(Spacer(1, 4))
        questions = results.get("questions") or []
        if not questions:
            flow.append(Paragraph("문항별 응답 데이터가 없습니다.", styles["qsub"]))
        for question in questions:
            flow.extend(_question_flow(question, styles, font))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        title=f"{program_name} 만족도조사 결과",
    )
    doc.build(flow)
    return buffer.getvalue(), _safe_filename(f"{program_name}_만족도조사_결과")


# ── 다른 PDF(연간 보고서)에서 재사용하는 공개 헬퍼 ──

def ensure_korean_font() -> str:
    """한글 폰트를 등록하고 폰트명을 돌려준다(미발견 시 Helvetica)."""
    return _ensure_font()


def make_styles(font: str) -> dict[str, ParagraphStyle]:
    return _styles(font)


def key_value_table(rows: list[list[Any]], font: str, *, label_width=None) -> Table:
    """좌측 라벨 / 우측 값 2열 표(빈 행은 호출부에서 제외)."""
    widths = [label_width or 32 * mm, None] if rows else None
    tbl = Table(rows, colWidths=widths, hAlign="LEFT")
    tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), font),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#334155")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return tbl


def survey_results_flowables(
    results: dict, styles: dict, font: str
) -> list:
    """설문 결과(summary + 문항)를 flowable 리스트로 — 연간 보고서에 임베드."""
    flow: list = [_summary_flow(results.get("summary") or {}, font), Spacer(1, 4)]
    questions = results.get("questions") or []
    if not questions:
        flow.append(Paragraph("문항별 응답 데이터가 없습니다.", styles["qsub"]))
    for question in questions:
        flow.extend(_question_flow(question, styles, font))
    return flow
