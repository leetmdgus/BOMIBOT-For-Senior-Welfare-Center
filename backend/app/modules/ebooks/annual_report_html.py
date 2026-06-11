"""연간 사업보고서(전자책자) → 한 권의 보기 좋은 HTML 렌더.

연도별 `{연도}_사업보고서` 책자의 entries(사업별)를 순회하며, 완료된
사업계획서·만족도조사 결과·사업평가 내용을 디자인된 HTML 페이지로 누적해 렌더한다.
전자책자처럼 뷰어 iframe 에서 이 HTML 을 열어 본다(인쇄 시 PDF 로도 저장 가능).
"""

from __future__ import annotations

import html
import logging
from typing import TYPE_CHECKING, Any

from app.modules.ebooks.annual_report_perf import aggregate_performance
from app.common.hwpx.document_sections import (
    hwpx_sections_from_document_sections,
)
from app.common.hwpx.models import HwpxTable
from app.common.core.datetime_kst import format_kst_datetime

if TYPE_CHECKING:
    from app.common.region_store.service import RegionStoreService

_log = logging.getLogger(__name__)

# 만족도 5점 척도 색상 (매우불만족 → 매우만족)
_SAT_BUCKETS = ("매우불만족", "불만족", "보통", "만족", "매우만족")
_SAT_COLORS = ("#ef4444", "#f97316", "#f59e0b", "#22c55e", "#16a34a")
_SCALE_COLORS = ("#ef4444", "#f97316", "#f59e0b", "#22c55e", "#16a34a")


def _esc(value: Any) -> str:
    return html.escape("" if value is None else str(value))


def _esc_br(value: Any) -> str:
    return _esc(value).replace("\n", "<br/>")


def _kv_table(pairs: list[tuple[str, Any]]) -> str:
    rows = []
    for label, value in pairs:
        text = "" if value is None else str(value).strip()
        if text:
            rows.append(
                f"<tr><th>{_esc(label)}</th><td>{_esc_br(text)}</td></tr>"
            )
    if not rows:
        return ""
    return f'<table class="kv">{"".join(rows)}</table>'


def _chips(values: Any) -> str:
    if not isinstance(values, list):
        return ""
    chips = [
        f'<span class="chip">{_esc(item)}</span>'
        for item in values
        if str(item or "").strip()
    ]
    return f'<div class="chips">{"".join(chips)}</div>' if chips else ""


def _field_block(label: str, value: Any) -> str:
    text = "" if value is None else str(value).strip()
    if not text:
        return ""
    return (
        f'<div class="field"><div class="field-label">{_esc(label)}</div>'
        f'<div class="field-body">{_esc_br(text)}</div></div>'
    )


def _hwpx_table_html(table: HwpxTable) -> str:
    if not table.rows:
        return ""
    tr_html = []
    for row in table.rows:
        cells = []
        for cell in row:
            tag = "th" if cell.header else "td"
            attrs = ""
            if cell.col_span and cell.col_span > 1:
                attrs += f' colspan="{cell.col_span}"'
            if cell.row_span and cell.row_span > 1:
                attrs += f' rowspan="{cell.row_span}"'
            if cell.background_color:
                attrs += f' style="background:{_esc(cell.background_color)}"'
            cells.append(f"<{tag}{attrs}>{_esc_br(cell.text)}</{tag}>")
        tr_html.append(f"<tr>{''.join(cells)}</tr>")
    return f'<table class="doc-table">{"".join(tr_html)}</table>'


def _sections_html(sections: Any, form_data: dict | None) -> str:
    if not isinstance(sections, list) or not sections:
        return ""
    normalized = [s for s in sections if isinstance(s, dict)]
    try:
        hwpx_sections = hwpx_sections_from_document_sections(
            normalized, form_data=form_data
        )
    except Exception:
        _log.debug("연간보고서 HTML 섹션 변환 실패", exc_info=True)
        return ""
    parts: list[str] = []
    for section in hwpx_sections:
        if section.title:
            parts.append(f'<h4 class="sub">{_esc(section.title)}</h4>')
        for para in section.paragraphs:
            variant = getattr(para, "variant", "body")
            if not str(para.text or "").strip():
                continue
            if variant in ("title", "heading"):
                parts.append(f'<h4 class="sub">{_esc(para.text)}</h4>')
            else:
                parts.append(f"<p>{_esc_br(para.text)}</p>")
        for table in section.tables:
            parts.append(_hwpx_table_html(table))
    return "".join(parts)


def _plan_html(plan: dict) -> str:
    form = plan.get("formData") or {}
    parts = [
        _kv_table(
            [
                ("사업명", form.get("projectName")),
                ("담당자", form.get("manager")),
                ("사업기간", form.get("period")),
                ("사업대상", form.get("target")),
                ("총 횟수", form.get("totalCount")),
                ("예산", form.get("budget")),
                ("예산과목", form.get("budgetCategory")),
            ]
        ),
        _field_block("사업목적", form.get("purpose")),
    ]
    goals = _chips(form.get("goals"))
    if goals:
        parts.append('<div class="field-label">목표</div>')
        parts.append(goals)

    sub_projects = form.get("subProjects")
    if isinstance(sub_projects, list) and sub_projects:
        rows = [
            "<tr><th>단위사업</th><th>산출목표</th><th>성과목표</th></tr>"
        ]
        for sp in sub_projects:
            if not isinstance(sp, dict):
                continue
            rows.append(
                f"<tr><td>{_esc(sp.get('name'))}</td>"
                f"<td>{_esc(sp.get('output'))}</td>"
                f"<td>{_esc(sp.get('outcome'))}</td></tr>"
            )
        if len(rows) > 1:
            parts.append('<div class="field-label">단위사업</div>')
            parts.append(f'<table class="doc-table">{"".join(rows)}</table>')

    parts.append(_sections_html(plan.get("sections"), form))
    body = "".join(p for p in parts if p)
    return body or '<p class="empty">작성된 사업계획 내용이 없습니다.</p>'


def _eval_html(ev: dict) -> str:
    parts = [
        _kv_table(
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
        ),
        _field_block("사업목적", ev.get("purpose")),
    ]
    goals = _chips(ev.get("goals"))
    if goals:
        parts.append('<div class="field-label">목표</div>')
        parts.append(goals)

    detail_rows = ev.get("detailRows")
    if isinstance(detail_rows, list):
        pairs = [
            (str(r.get("label") or ""), r.get("content"))
            for r in detail_rows
            if isinstance(r, dict)
        ]
        parts.append(_kv_table(pairs))

    for label, key in (
        ("성과지표", "performanceIndicator"),
        ("평가도구", "evaluationTool"),
        ("주요 요인 분석", "keyFactorAnalysis"),
        ("목표 적정성", "goalAppropriacy"),
        ("제언", "suggestion"),
        ("지도·점검", "supervision"),
    ):
        parts.append(_field_block(label, ev.get(key)))

    parts.append(_sections_html(ev.get("sections"), None))
    body = "".join(p for p in parts if p)
    return body or '<p class="empty">작성된 사업평가 내용이 없습니다.</p>'


def _stat_cards(summary: dict) -> str:
    def _avg(value: Any) -> str:
        try:
            return f"{float(value):.2f}"
        except (TypeError, ValueError):
            return "-"

    cards = [
        ("총 응답", f"{summary.get('totalResponses', 0)}명"),
        ("응답 목표", f"{summary.get('totalTarget', 0)}명"),
        ("평균 만족도", f"{_avg(summary.get('averageSatisfaction'))} / 5"),
        ("완료율", f"{summary.get('completionRate', 0)}%"),
        ("긍정 응답률", f"{summary.get('positiveRate', 0)}%"),
    ]
    items = "".join(
        f'<div class="stat"><div class="stat-value">{_esc(value)}</div>'
        f'<div class="stat-label">{_esc(label)}</div></div>'
        for label, value in cards
    )
    return f'<div class="stats">{items}</div>'


def _bar_rows(items: list[tuple[str, int, str]]) -> str:
    """items: (label, count, color). 막대 너비는 최대값 기준 비율."""
    max_count = max((c for _, c, _ in items), default=0) or 1
    rows = []
    for label, count, color in items:
        pct = round(count / max_count * 100)
        rows.append(
            f'<div class="bar-row"><div class="bar-label">{_esc(label)}</div>'
            f'<div class="bar-track"><div class="bar-fill" '
            f'style="width:{pct}%;background:{color}"></div></div>'
            f'<div class="bar-value">{count}</div></div>'
        )
    return f'<div class="bars">{"".join(rows)}</div>'


def _stacked_row(name: str, counts: list[int]) -> str:
    total = sum(counts) or 1
    segs = []
    for value, color in zip(counts, _SAT_COLORS):
        if value <= 0:
            continue
        pct = value / total * 100
        segs.append(
            f'<div class="seg" style="width:{pct:.4f}%;background:{color}" '
            f'title="{value}"></div>'
        )
    return (
        f'<div class="bar-row"><div class="bar-label">{_esc(name)}</div>'
        f'<div class="stacked">{"".join(segs)}</div></div>'
    )


def _sat_legend() -> str:
    items = "".join(
        f'<span class="lg"><i style="background:{color}"></i>{_esc(label)}</span>'
        for label, color in zip(_SAT_BUCKETS, _SAT_COLORS)
    )
    return f'<div class="legend">{items}</div>'


def _question_html(question: dict) -> str:
    title = question.get("title") or "(제목 없음)"
    answered = question.get("answeredCount", 0)
    skipped = question.get("skippedCount", 0)
    qtype = question.get("type")
    parts = [
        f'<div class="q-head"><span class="q-title">{_esc(title)}</span>'
        f'<span class="q-meta">응답 {answered} · 무응답 {skipped}</span></div>'
    ]

    if qtype == "choice":
        pie = question.get("pieData") or []
        items = [
            (str(p.get("name", "")), int(p.get("value", 0) or 0), str(p.get("color") or "#3b82f6"))
            for p in pie
        ]
        if items:
            parts.append(_bar_rows(items))
    elif qtype == "scale":
        counts = {p.get("score"): int(p.get("count", 0) or 0) for p in question.get("scaleData") or []}
        items = [
            (f"{score}점", counts.get(score, 0), _SCALE_COLORS[min(score - 1, 4)])
            for score in range(1, 6)
        ]
        parts.append(_bar_rows(items))
        avg = question.get("average")
        if avg is not None:
            parts.append(f'<div class="avg-badge">평균 {_esc(avg)} / 5</div>')
    elif qtype == "matrix":
        chart = question.get("matrixChart") or []
        if chart:
            parts.append(_sat_legend())
            rows = "".join(
                _stacked_row(
                    str(row.get("name", "")),
                    [int(row.get(b, 0) or 0) for b in _SAT_BUCKETS],
                )
                for row in chart
            )
            parts.append(f'<div class="bars">{rows}</div>')
        avg = question.get("average")
        if avg is not None:
            parts.append(f'<div class="avg-badge">평균 {_esc(avg)} / 5</div>')
    elif qtype == "text":
        texts = question.get("textResponses") or []
        quotes = "".join(
            f'<blockquote class="quote">{_esc(item.get("text", ""))}</blockquote>'
            for item in texts[:50]
        )
        if len(texts) > 50:
            quotes += f'<p class="more">… 외 {len(texts) - 50}건</p>'
        parts.append(quotes or '<p class="empty">주관식 응답이 없습니다.</p>')

    return f'<div class="question">{"".join(parts)}</div>'


def _survey_html(results: dict, survey_title: str) -> str:
    parts = [f'<h4 class="sub">{_esc(survey_title)}</h4>']
    parts.append(_stat_cards(results.get("summary") or {}))
    questions = results.get("questions") or []
    if not questions:
        parts.append('<p class="empty">문항별 응답 데이터가 없습니다.</p>')
    for question in questions:
        parts.append(_question_html(question))
    return "".join(parts)


def _subsection(roman: str, label: str, body: str) -> str:
    return (
        f'<section class="subsection">'
        f'<div class="sub-head"><span class="roman">{roman}</span>{_esc(label)}</div>'
        f"{body}</section>"
    )


_DEFAULT_INTRO = (
    "본 보고서는 해당 연도에 수행한 사업의 계획·실적·만족도조사·평가 결과를 사업별로 "
    "정리한 종합 사업보고서입니다. 각 사업의 추진 내용과 성과를 한눈에 확인할 수 있도록 "
    "구성하였습니다."
)


def _int(value: Any) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _performance_html(rows: Any) -> str:
    """실적관리 — 세목·세세목별 집계 표(실적보고서 형식).

    연인원 = 인원 × 횟수(행별 곱의 합), 원천(재원) 표시, 월별 행은 세목-세세목으로 압축.
    """
    agg, tot = aggregate_performance(rows)
    if not agg:
        return '<p class="empty">실적관리 데이터가 없습니다.</p>'
    head = (
        "<tr><th>세부사업명</th><th>상세분류</th><th>원천</th>"
        "<th>계획연인원</th><th>실적연인원</th><th>계획횟수</th><th>실적횟수</th>"
        "<th>계획예산</th></tr>"
    )
    body_rows = [
        "<tr>"
        f"<td>{_esc(g['subProject'])}</td>"
        f"<td>{_esc(g.get('detailCategory')) or '-'}</td>"
        f"<td>{_esc(g['sources']) or '-'}</td>"
        f"<td class='num'>{g['planYearly']:,}</td>"
        f"<td class='num act'>{g['actualYearly']:,}</td>"
        f"<td class='num'>{g['planCount']:,}</td>"
        f"<td class='num act'>{g['actualCount']:,}</td>"
        f"<td class='num'>{g['planBudget']:,}</td>"
        "</tr>"
        for g in agg
    ]
    foot = (
        "<tr class='total'>"
        f"<td colspan='2'>합계</td><td>{_esc(tot['sources']) or '-'}</td>"
        f"<td class='num'>{tot['planYearly']:,}</td>"
        f"<td class='num act'>{tot['actualYearly']:,}</td>"
        f"<td class='num'>{tot['planCount']:,}</td>"
        f"<td class='num act'>{tot['actualCount']:,}</td>"
        f"<td class='num'>{tot['planBudget']:,}</td>"
        "</tr>"
    )
    return f'<table class="doc-table perf">{head}{"".join(body_rows)}{foot}</table>'


def _org_employee_table(employees: Any) -> str:
    rows = [e for e in (employees or []) if isinstance(e, dict)]
    if not rows:
        return ""
    head = "<tr><th>이름</th><th>직위</th><th>역할</th><th>이메일</th></tr>"
    body = "".join(
        f"<tr><td>{_esc(e.get('name'))}</td><td>{_esc(e.get('position'))}</td>"
        f"<td>{_esc(e.get('role'))}</td><td>{_esc(e.get('email'))}</td></tr>"
        for e in rows
    )
    return f'<table class="doc-table org">{head}{body}</table>'


def _org_html(org_data: dict | None) -> str:
    if not isinstance(org_data, dict):
        return '<p class="empty">조직 정보를 불러오지 못했습니다.</p>'
    departments = [d for d in (org_data.get("departments") or []) if isinstance(d, dict)]
    if not departments:
        tbl = _org_employee_table(org_data.get("employees"))
        return tbl or '<p class="empty">등록된 조직 정보가 없습니다.</p>'
    parts: list[str] = []
    for dept in departments:
        name = _esc(dept.get("name") or "부서")
        count = dept.get("count")
        cnt = (
            f' <span class="dept-count">({count}명)</span>'
            if isinstance(count, int)
            else ""
        )
        parts.append(f'<h4 class="sub">{name}{cnt}</h4>')
        tbl = _org_employee_table(dept.get("employees"))
        parts.append(tbl or '<p class="empty">소속 직원이 없습니다.</p>')
    return "".join(parts)


def _major_of(entry: dict, major_map: dict | None) -> str:
    """업무(중분류)가 속한 대분류(사업명). 칸반 메타 → entry 저장값 → 팀 순 폴백."""
    tid = str(entry.get("taskId") or "")
    if major_map:
        m = str(major_map.get(tid) or "").strip()
        if m:
            return m
    for key in ("majorCategory", "major", "team"):
        v = str(entry.get(key) or "").strip()
        if v:
            return v
    return "기타 사업"


def _entry_html(
    service: RegionStoreService,
    region_id: str,
    index: int,
    entry: dict,
    *,
    major: str | None = None,
) -> str:
    program = entry.get("programName") or "이름 없는 사업"
    task_id = str(entry.get("taskId") or "")
    subs: list[tuple[str, str]] = []  # (라벨, 본문) — 순서대로 로마숫자 부여

    # 네 섹션 항상 노출(데이터 없으면 안내 문구): 실적관리 → 사업계획서 → 만족도조사 → 사업평가
    perf_body = '<p class="empty">실적관리 데이터가 없습니다.</p>'
    if task_id:
        try:
            perf_body = _performance_html(
                service.get_input_management_rows(region_id, task_id, task_title=program)
            )
        except Exception:
            _log.debug("연간보고서 HTML 실적관리 실패 task=%s", task_id, exc_info=True)
    subs.append(("실적관리", perf_body))

    plan_body = '<p class="empty">작성된 사업계획 내용이 없습니다.</p>'
    if task_id:
        try:
            plan_body = _plan_html(service.get_business_plan(region_id, task_id))
        except Exception:
            _log.debug("연간보고서 HTML 사업계획 실패 task=%s", task_id, exc_info=True)
    subs.append(("사업계획서", plan_body))

    survey_body = '<p class="empty">만족도조사 결과 데이터가 없습니다.</p>'
    if task_id:
        try:
            metas = service.list_task_surveys(region_id, task_id)
        except Exception:
            metas = []
        survey_parts: list[str] = []
        seen_survey_ids: set[str] = set()
        for meta in metas:
            sid = str(meta.get("id") or "")
            if not sid or sid in seen_survey_ids:  # 빈/중복 설문 제외
                continue
            seen_survey_ids.add(sid)
            try:
                results = service.get_survey_results(region_id, sid)
            except Exception:
                continue
            survey_parts.append(_survey_html(results, meta.get("title") or "만족도조사"))
        if survey_parts:
            survey_body = "".join(survey_parts)
    subs.append(("만족도조사 결과", survey_body))

    eval_body = '<p class="empty">작성된 사업평가 내용이 없습니다.</p>'
    if task_id:
        try:
            eval_body = _eval_html(service.get_business_evaluation(region_id, task_id))
        except Exception:
            _log.debug("연간보고서 HTML 사업평가 실패 task=%s", task_id, exc_info=True)
    subs.append(("사업평가", eval_body))

    romans = ("Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ")
    blocks = "".join(
        _subsection(romans[i] if i < len(romans) else str(i + 1), label, body)
        for i, (label, body) in enumerate(subs)
    )
    team = entry.get("team")
    team_html = f'<span class="entry-team">{_esc(team)}</span>' if team else ""
    major_html = (
        f'<div class="entry-major">사업명 · {_esc(major)}</div>' if major else ""
    )
    return (
        f'<article class="entry" data-kind="entry">'
        f'<div class="entry-head"><span class="entry-no">{index}</span>'
        f'<div class="entry-titles">{major_html}'
        f'<h2 class="entry-title">{_esc(program)}</h2></div>{team_html}</div>'
        f"{blocks}</article>"
    )


def build_annual_report_html(
    service: RegionStoreService,
    region_id: str,
    book: dict,
    *,
    org_data: dict | None = None,
    major_category_map: dict | None = None,
) -> str:
    """책자(연간 보고서) 한 권을 디자인된 HTML 문자열로 렌더한다.

    구성: 표지 → 목차 → 사업 개요 → 조직현황 → 대분류(사업명)별 본문
    (대분류 > 중분류(프로그램) > 소분류: 실적관리·사업계획서·만족도조사·사업평가).
    `major_category_map`(task_id → 대분류)으로 프로그램을 사업명별로 묶는다.
    """
    title = book.get("title") or "사업보고서"
    team = book.get("team") or ""
    year = book.get("year") or ""
    entries = [e for e in (book.get("entries") or []) if isinstance(e, dict)]

    # 표지 이미지: coverImage(data URI/base64) 지정 시 사용
    raw_cover = book.get("coverImage") or book.get("coverImageDataUri")
    cover_img = ""
    if isinstance(raw_cover, str) and raw_cover.strip():
        src = (
            raw_cover
            if raw_cover.startswith("data:")
            else f"data:image/png;base64,{raw_cover}"
        )
        cover_img = f'<div class="cover-img"><img src="{_esc(src)}" alt=""/></div>'

    # 대분류(사업명) > 중분류(프로그램) 로 그룹화 — 첫 등장 순서 유지
    groups: list[tuple[str, list[dict]]] = []
    group_index: dict[str, int] = {}
    for e in entries:
        major = _major_of(e, major_category_map)
        if major not in group_index:
            group_index[major] = len(groups)
            groups.append((major, []))
        groups[group_index[major]][1].append(e)

    if entries:
        toc_groups: list[str] = []
        counter = 0
        for major, group_entries in groups:
            items = ""
            for e in group_entries:
                counter += 1
                items += (
                    f'<li><span class="toc-no">{counter}</span>'
                    f'{_esc(e.get("programName") or "이름 없는 사업")}</li>'
                )
            toc_groups.append(
                f'<div class="toc-group"><div class="toc-major">{_esc(major)}</div>'
                f'<ol class="toc-ol">{items}</ol></div>'
            )
        toc_block = "".join(toc_groups)
    else:
        toc_block = (
            '<p class="empty">아직 기입된 사업이 없습니다. 사업관리에서 '
            "사업계획·만족도조사·사업평가를 「완료」하면 이 보고서에 자동으로 추가됩니다.</p>"
        )

    intro = str(book.get("intro") or "").strip() or _DEFAULT_INTRO
    org_block = _org_html(org_data)
    meta_line = " · ".join(
        p for p in [team, f"{year}년" if year else "", f"사업 {len(entries)}건"] if p
    )

    # 원본 시트(분할 전) — 화면에선 JS가 A4 한 장씩(.leaf)으로 자동 분할, 인쇄 시 전체 펼침.
    # data-kind: cover(한 장 고정) / section·major·entry(내용에 따라 자동 분할).
    leaves: list[str] = [
        (
            f'<div class="page cover" data-kind="cover"><div class="cover-band"></div>{cover_img}'
            f'<div class="cover-body"><div class="cover-kicker">연간 보고서</div>'
            f'<h1 class="cover-title">{_esc(title)}</h1>'
            f'<div class="cover-meta">{_esc(meta_line)}</div>'
            f'<div class="cover-date">생성일 {_esc(format_kst_datetime())}</div>'
            f"</div></div>"
        ),
        f'<div class="page section-page" data-kind="section"><h3 class="page-title">목차</h3>{toc_block}</div>',
        (
            f'<div class="page section-page" data-kind="section"><h3 class="page-title">사업 개요</h3>'
            f'<p class="intro">{_esc_br(intro)}</p></div>'
        ),
        f'<div class="page section-page" data-kind="section"><h3 class="page-title">조직현황</h3>{org_block}</div>',
    ]
    # 대분류 표지(사업명) → 그 아래 중분류(프로그램) 페이지들
    counter = 0
    for major, group_entries in groups:
        program_items = "".join(
            f'<li>{_esc(e.get("programName") or "이름 없는 사업")}</li>'
            for e in group_entries
        )
        leaves.append(
            f'<div class="page major-page" data-kind="major"><div class="major-kicker">사업명 · 대분류</div>'
            f'<h2 class="major-title">{_esc(major)}</h2>'
            f'<div class="major-sub">프로그램(중분류) {len(group_entries)}건</div>'
            f'<ol class="major-programs">{program_items}</ol></div>'
        )
        for e in group_entries:
            counter += 1
            leaves.append(
                _entry_html(service, region_id, counter, e, major=major)
            )
    # JS 가 #src 의 원본을 측정해 .stage 에 A4 페이지로 흘려 담는다(분할 실패 시 폴백).
    src_sheets = "".join(leaves)

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{_esc(title)}</title>
<style>{_CSS}</style>
</head>
<body>
<div id="src">{src_sheets}</div>
<div class="viewer" id="viewer"><div class="stage" id="stage"></div></div>
<div class="toolbar">
<div class="seg"><button class="seg-btn on" id="pg-m1">한 쪽</button><button class="seg-btn" id="pg-m2">두 쪽</button></div>
<span class="sep"></span>
<button class="nav" id="pg-prev" aria-label="이전 페이지">‹</button>
<span class="ind" id="pg-ind"></span>
<button class="nav" id="pg-next" aria-label="다음 페이지">›</button>
</div>
<script>{_BOOK_JS}</script>
</body>
</html>"""


_CSS = """
:root{
  --navy:#1a2744; --navy2:#26365c; --ink:#0f172a; --muted:#64748b;
  --line:#e2e8f0; --soft:#f1f5f9; --accent:#2563eb; --bg:#eef2f7;
}
*{box-sizing:border-box;}
body{
  margin:0; padding:0; background:var(--bg); color:var(--ink);
  font-family:'Pretendard','Noto Sans KR','Malgun Gothic','맑은 고딕',-apple-system,BlinkMacSystemFont,sans-serif;
  font-size:14px; line-height:1.6; -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
.page, .entry{
  max-width:840px; margin:0 auto 24px; background:#fff; border:1px solid var(--line);
  border-radius:16px; box-shadow:0 8px 30px rgba(15,23,42,.06); overflow:hidden;
}
.entry{ padding:0 0 28px; }
/* 표지 */
.cover{ padding:0; }
.cover-band{ height:14px; background:linear-gradient(90deg,var(--navy),var(--accent)); }
.cover-body{ padding:48px 48px 40px; }
.cover-kicker{ color:var(--accent); font-weight:700; letter-spacing:.18em; font-size:12px; }
.cover-title{ font-size:34px; font-weight:800; margin:10px 0 14px; color:var(--navy); letter-spacing:-.01em; }
.cover-meta{ color:var(--muted); font-size:15px; }
.cover-date{ color:var(--muted); font-size:12.5px; margin-top:2px; }
.cover-empty{ margin-top:28px; }
.toc{ margin-top:30px; border-top:1px dashed var(--line); padding-top:18px; }
.toc h3{ font-size:14px; color:var(--navy); margin:0 0 10px; }
.toc ol{ list-style:none; margin:0; padding:0; columns:2; column-gap:28px; }
.toc li{ display:flex; align-items:center; gap:10px; padding:5px 0; break-inside:avoid; color:#334155; }
.toc-no{ flex:none; width:22px; height:22px; border-radius:50%; background:var(--soft);
  color:var(--navy); font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; }
/* 사업 항목 */
.entry-head{ display:flex; align-items:center; gap:14px; padding:24px 36px;
  background:linear-gradient(90deg,rgba(37,99,235,.08),transparent); border-bottom:1px solid var(--line); }
.entry-no{ flex:none; width:34px; height:34px; border-radius:10px; background:var(--navy);
  color:#fff; font-weight:800; display:flex; align-items:center; justify-content:center; }
.entry-title{ font-size:21px; font-weight:800; margin:0; color:var(--navy); flex:1; }
.entry-team{ font-size:12.5px; color:var(--muted); background:var(--soft); padding:4px 10px; border-radius:999px; }
/* 소단원 */
.subsection{ padding:22px 36px 6px; }
.sub-head{ display:flex; align-items:center; gap:10px; font-size:15px; font-weight:800;
  color:var(--navy); margin:6px 0 14px; }
.roman{ flex:none; min-width:26px; height:26px; padding:0 8px; border-radius:8px;
  background:var(--navy); color:#fff; font-size:13px; display:inline-flex; align-items:center; justify-content:center; }
h4.sub{ font-size:13.5px; color:var(--navy2); margin:16px 0 8px; padding-left:10px; border-left:3px solid var(--accent); }
p{ margin:6px 0; }
.empty{ color:var(--muted); font-size:13px; }
.more{ color:var(--muted); font-size:12.5px; }
/* 표 */
table{ width:100%; border-collapse:collapse; margin:8px 0 14px; font-size:13px; }
.kv th{ width:120px; text-align:left; background:var(--soft); color:#334155; font-weight:600;
  border:1px solid var(--line); padding:8px 12px; vertical-align:top; }
.kv td{ border:1px solid var(--line); padding:8px 12px; vertical-align:top; }
.doc-table th{ background:var(--soft); color:#334155; }
.doc-table th, .doc-table td{ border:1px solid var(--line); padding:8px 10px; vertical-align:top; text-align:left; }
/* 칩 */
.field{ margin:10px 0 14px; }
.field-label{ font-size:12.5px; font-weight:700; color:var(--muted); margin:12px 0 6px; }
.field-body{ white-space:pre-wrap; }
.chips{ display:flex; flex-wrap:wrap; gap:6px; margin:4px 0 12px; }
.chip{ background:#eff6ff; color:#1d4ed8; border:1px solid #dbeafe; border-radius:999px;
  padding:4px 12px; font-size:12.5px; font-weight:600; }
/* 만족도 통계 카드 */
.stats{ display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin:10px 0 18px; }
.stat{ background:var(--soft); border:1px solid var(--line); border-radius:12px; padding:14px 10px; text-align:center; }
.stat-value{ font-size:19px; font-weight:800; color:var(--navy); }
.stat-label{ font-size:11.5px; color:var(--muted); margin-top:3px; }
/* 막대 차트 */
.bars{ margin:6px 0 16px; }
.bar-row{ display:flex; align-items:center; gap:10px; margin:5px 0; }
.bar-label{ flex:none; width:88px; font-size:12.5px; color:#475569; text-align:right; }
.bar-track{ flex:1; height:18px; background:var(--soft); border-radius:6px; overflow:hidden; }
.bar-fill{ height:100%; border-radius:6px; min-width:2px; }
.bar-value{ flex:none; width:34px; font-size:12.5px; color:#334155; font-weight:600; }
.stacked{ flex:1; height:18px; border-radius:6px; overflow:hidden; display:flex; background:var(--soft); }
.stacked .seg{ height:100%; }
.avg-badge{ display:inline-block; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;
  border-radius:999px; padding:3px 12px; font-size:12.5px; font-weight:700; margin:2px 0 6px; }
.legend{ display:flex; flex-wrap:wrap; gap:12px; margin:4px 0 10px; }
.legend .lg{ display:inline-flex; align-items:center; gap:5px; font-size:11.5px; color:#475569; }
.legend i{ width:11px; height:11px; border-radius:3px; display:inline-block; }
/* 문항 */
.question{ border-top:1px solid var(--line); padding:12px 0 2px; }
.question:first-of-type{ border-top:none; }
.q-head{ display:flex; align-items:baseline; justify-content:space-between; gap:10px; }
.q-title{ font-size:13.5px; font-weight:700; color:#1e293b; }
.q-meta{ flex:none; font-size:11.5px; color:var(--muted); }
.quote{ margin:6px 0; padding:8px 14px; background:var(--soft); border-left:3px solid var(--accent);
  border-radius:0 8px 8px 0; font-size:13px; color:#334155; }
/* 표지 이미지 */
.cover-img{ width:100%; max-height:320px; overflow:hidden; }
.cover-img img{ width:100%; height:100%; object-fit:cover; display:block; }
/* 구역 페이지 (목차·개요·조직현황) */
.section-page{ padding:40px 48px; }
.page-title{ font-size:22px; font-weight:800; color:var(--navy); margin:0 0 18px;
  padding-bottom:10px; border-bottom:2px solid var(--navy); }
.toc-ol{ list-style:none; margin:0; padding:0; columns:2; column-gap:28px; }
.toc-ol li{ display:flex; align-items:center; gap:10px; padding:6px 0; break-inside:avoid; color:#334155; }
.intro{ font-size:14px; color:#334155; line-height:1.8; }
.dept-count{ color:var(--muted); font-weight:600; font-size:12.5px; }
.doc-table .num{ text-align:right; font-variant-numeric:tabular-nums; }
.doc-table tr.total td{ font-weight:800; background:var(--soft); color:var(--navy); }
.org th, .org td{ font-size:12.5px; padding:6px 10px; }
/* 실적관리 — 실적보고서 형식(짙은 머리글 + 실적 강조) */
.perf th{ background:var(--navy); color:#fff; border-color:var(--navy2); font-size:11.5px; padding:6px 7px; }
.perf td{ font-size:12px; padding:5px 7px; }
.perf .act{ color:#0369a1; font-weight:600; }
/* 목차 — 대분류(사업명)별 그룹 */
.toc-group{ margin:0 0 18px; break-inside:avoid; }
.toc-major{ font-size:14px; font-weight:800; color:var(--navy); margin:0 0 8px;
  padding:6px 12px; background:var(--soft); border-left:4px solid var(--accent); border-radius:0 8px 8px 0; }
/* 대분류(사업명) 표지 페이지 */
.major-page{ padding:48px 48px; }
.major-kicker{ color:var(--accent); font-weight:700; letter-spacing:.16em; font-size:12px; }
.major-title{ font-size:28px; font-weight:800; color:var(--navy); margin:10px 0 6px; letter-spacing:-.01em; }
.major-sub{ color:var(--muted); font-size:13px; margin-bottom:18px; }
.major-programs{ list-style:none; margin:0; padding:0; }
.major-programs li{ padding:10px 14px; margin:6px 0; background:var(--soft); border:1px solid var(--line);
  border-radius:10px; font-size:14px; font-weight:600; color:#334155; }
.major-programs li::before{ content:"\\25B8  "; color:var(--accent); font-weight:800; }
/* 사업 항목 헤더의 대분류 라벨 */
.entry-titles{ flex:1; min-width:0; }
.entry-major{ font-size:11.5px; font-weight:700; color:var(--accent); letter-spacing:.04em; margin-bottom:2px; }
/* ===== A4 페이지 뷰어 — 한 쪽 / 두 쪽(펼침) + 자동 분할 ===== */
:root{ --pw:794px; --ph:1123px; }            /* A4 210×297mm @96dpi */
#src{ display:none; }                          /* 원본(분할 전) — JS가 측정용으로만 사용 */
.viewer{ position:fixed; inset:0; overflow:auto; background:var(--bg);
  display:flex; align-items:flex-start; justify-content:center; padding:24px 24px 92px; }
.stage{ display:flex; gap:28px; align-items:flex-start; transform-origin:top center; }
.leaf{ width:var(--pw); height:var(--ph); flex:none; background:#fff; border-radius:3px;
  box-shadow:0 12px 40px rgba(15,23,42,.20); overflow:hidden; }
.leaf.grow{ height:auto; }                      /* 한 덩어리가 A4보다 큰 드문 경우만 늘림(잘림 방지) */
.leaf-inner{ width:100%; height:100%; overflow:hidden; }
.leaf-inner.grow{ height:auto; overflow:visible; }
.leaf-inner.scroll{ overflow:auto; }            /* 폴백(분할 실패 시) */
.leaf .page, .leaf .entry{ max-width:none; margin:0; border:none; box-shadow:none;
  border-radius:0; min-height:100%; }
/* 하단 컨트롤 바 */
.toolbar{ position:fixed; left:50%; bottom:16px; transform:translateX(-50%); z-index:60;
  display:flex; align-items:center; gap:6px; background:rgba(255,255,255,.96);
  border:1px solid var(--line); border-radius:999px; padding:6px 8px;
  box-shadow:0 8px 24px rgba(15,23,42,.18); }
.toolbar .nav{ border:none; background:transparent; color:var(--navy); cursor:pointer;
  font-size:22px; line-height:1; padding:4px 12px; border-radius:999px; font-weight:700; }
.toolbar .nav:disabled{ opacity:.35; cursor:default; }
.seg{ display:flex; background:var(--soft); border-radius:999px; padding:2px; }
.seg-btn{ border:none; background:transparent; cursor:pointer; color:var(--muted);
  font-size:13px; font-weight:700; padding:6px 14px; border-radius:999px; }
.seg-btn.on{ background:var(--navy); color:#fff; }
.ind{ font-size:12.5px; font-weight:700; color:#334155; min-width:72px; text-align:center; }
.sep{ width:1px; height:20px; background:var(--line); margin:0 4px; }
@media print{
  /* 새 창 뷰어와 똑같이: .leaf 한 장 = A4 한 페이지(같은 분할 그대로 인쇄).
     여백은 페이지 마진이 아니라 내용 자체 패딩으로 — 그래야 화면 분할과 1:1로 맞음. */
  @page{ size:A4; margin:0; }
  html, body{ background:#fff; margin:0; padding:0; }
  #src{ display:none!important; }
  .viewer{ position:static; inset:auto; overflow:visible; display:block; margin:0; padding:0; background:#fff; }
  .stage{ display:block; zoom:1!important; transform:none!important; gap:0; }
  .toolbar{ display:none!important; }
  .leaf{ width:210mm; height:297mm; margin:0; box-shadow:none; border-radius:0; overflow:hidden; }
  .leaf + .leaf{ break-before:page; page-break-before:always; }   /* 각 장을 페이지 머리에 다시 고정(누적 오차 방지) */
  .leaf[hidden]{ display:block!important; }                        /* 화면서 숨긴 페이지도 모두 인쇄 */
  .leaf.grow{ height:auto; overflow:visible; }                     /* A4보다 큰 한 덩어리만 여러 장에 걸침 */
  .leaf-inner{ height:100%; overflow:hidden; }
  .leaf.grow .leaf-inner{ height:auto; overflow:visible; }
  .leaf .page, .leaf .entry{ min-height:100%; box-shadow:none; border:none; border-radius:0; }
}
"""


# iframe/새 창 안에서 도는 A4 페이지 뷰어 컨트롤러 (CSP 없음 — 인라인 스크립트 허용)
# (1) 자동 분할: #src 원본 블록을 렌더 높이로 측정해 A4 한 장씩(.leaf)으로 흘려 담는다.
#     - cover 는 한 장 고정, 나머지는 블록(소단원 단위까지) 단위로 분할.
#     - 한 덩어리(표 등)가 A4보다 크면 잘리지 않게 그 페이지만 늘린다(grow).
# (2) 한 쪽/두 쪽 토글 + 화면에 맞춰 배율 축소(zoom) + 이전/다음 이동.
# 분할 중 예외가 나면 원본을 스크롤 페이지로 그대로 보여주는 폴백을 둔다.
_BOOK_JS = """
(function(){
  var stage=document.getElementById('stage');
  var src=document.getElementById('src');
  if(!stage||!src)return;
  function toArr(x){return Array.prototype.slice.call(x);}
  var ind=document.getElementById('pg-ind');
  var prev=document.getElementById('pg-prev');
  var next=document.getElementById('pg-next');
  var m1=document.getElementById('pg-m1');
  var m2=document.getElementById('pg-m2');
  var leaves=[], mode=1, cur=0;

  function newLeaf(cls){
    var l=document.createElement('div'); l.className='leaf';
    var inner=document.createElement('div'); inner.className='leaf-inner'+(cls?(' '+cls):'');
    l.appendChild(inner); stage.appendChild(l); return inner;
  }
  function over(inner){ return inner.scrollHeight > inner.clientHeight + 2; }
  function grow(inner){ inner.classList.add('grow'); inner.parentNode.className+=' grow'; }
  function splitKids(b){                          // 소단원(.subsection)만 한 단계 더 분할
    if(b.classList && b.classList.contains('subsection')){
      var ch=toArr(b.children); return ch.length>1?ch:null;
    }
    return null;
  }
  function build(){
    stage.style.zoom='1'; stage.innerHTML='';
    toArr(src.children).forEach(function(sheet){
      var kind=sheet.getAttribute('data-kind')||'section';
      if(kind==='cover'){ newLeaf('solid').appendChild(sheet.cloneNode(true)); return; }
      var blocks=toArr(sheet.children);
      var inner=newLeaf(); var shell=sheet.cloneNode(false); inner.appendChild(shell);
      for(var i=0;i<blocks.length;i++){
        var b=blocks[i].cloneNode(true);
        shell.appendChild(b);
        if(!over(inner)) continue;
        shell.removeChild(b);
        var subs=splitKids(b);
        if(!subs){                                // 통짜 블록 → 다음 장으로
          if(shell.children.length>0){ inner=newLeaf(); shell=sheet.cloneNode(false); inner.appendChild(shell); }
          shell.appendChild(b);
          if(over(inner)){ grow(inner); inner=newLeaf(); shell=sheet.cloneNode(false); inner.appendChild(shell); }
          continue;
        }
        var sub=b.cloneNode(false); shell.appendChild(sub);   // 소단원을 자식 단위로 흘림
        if(over(inner)){ shell.removeChild(sub); inner=newLeaf(); shell=sheet.cloneNode(false); inner.appendChild(shell); sub=b.cloneNode(false); shell.appendChild(sub); }
        for(var j=0;j<subs.length;j++){
          var s=subs[j].cloneNode(true); sub.appendChild(s);
          if(!over(inner)) continue;
          sub.removeChild(s);
          inner=newLeaf(); shell=sheet.cloneNode(false); inner.appendChild(shell);
          sub=b.cloneNode(false); shell.appendChild(sub); sub.appendChild(s);
          if(over(inner)){ grow(inner); inner=newLeaf(); shell=sheet.cloneNode(false); inner.appendChild(shell); sub=b.cloneNode(false); shell.appendChild(sub); }
        }
      }
    });
    toArr(stage.children).forEach(function(l){    // 빈 셸/빈 페이지 정리 (안쪽부터)
      toArr(l.querySelectorAll('.subsection,.entry,.page')).reverse().forEach(function(el){
        if(el.children.length===0 && el.parentNode) el.parentNode.removeChild(el);
      });
      var inner=l.firstChild;
      if(!inner || inner.children.length===0) stage.removeChild(l);
    });
    leaves=toArr(stage.children);
  }

  function fit(){
    stage.style.zoom='1';
    var availW=window.innerWidth-56, availH=window.innerHeight-104;   // 하단 바 여백
    var natW=stage.scrollWidth||1, natH=stage.scrollHeight||1;
    var z=Math.min(availW/natW, availH/natH);
    if(z>1)z=1; if(z<0.25)z=0.25;
    stage.style.zoom=z;
  }
  function render(){
    var n=leaves.length;
    for(var i=0;i<n;i++){ leaves[i].hidden=!(i>=cur && i<cur+mode); }
    var last=Math.min(cur+mode,n);
    if(ind)ind.textContent=(last>cur+1?(cur+1)+'–'+last:(cur+1))+' / '+n;
    if(prev)prev.disabled=(cur<=0);
    if(next)next.disabled=(cur+mode>=n);
    fit();
  }
  function go(d){ var n=leaves.length,t=cur+d*mode; if(t<0)t=0; if(t>n-1)t=n-1; cur=t; render(); }
  function setMode(m){ mode=m; if(mode===2)cur=cur-(cur%2);
    if(m1)m1.className='seg-btn'+(m===1?' on':''); if(m2)m2.className='seg-btn'+(m===2?' on':''); render(); }

  try{ build(); }catch(e){                        // 폴백: 분할 없이 원본을 스크롤 페이지로
    stage.innerHTML='';
    toArr(src.children).forEach(function(sheet){ newLeaf('scroll').appendChild(sheet.cloneNode(true)); });
    leaves=toArr(stage.children);
  }
  if(!leaves.length){ leaves=toArr(stage.children); }

  if(prev)prev.onclick=function(){go(-1);};
  if(next)next.onclick=function(){go(1);};
  if(m1)m1.onclick=function(){setMode(1);};
  if(m2)m2.onclick=function(){setMode(2);};
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='PageDown'){go(1);e.preventDefault();}
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){go(-1);e.preventDefault();}
  });
  window.addEventListener('resize',fit);
  setMode(1);
})();
"""
