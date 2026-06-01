"""Rule-based assistant answers (parity with frontend lib/chat/assistant-engine.ts)."""

from __future__ import annotations

import re
from typing import Any

MONTH_PATTERN = re.compile(r"(\d{1,2})\s*월")


def _format_won(value: int) -> str:
    return f"{value:,}원"


def _empty_metrics() -> dict[str, int]:
    return {
        "planPeople": 0,
        "planCount": 0,
        "planBudget": 0,
        "actualPeople": 0,
        "actualCount": 0,
        "actualExpense": 0,
    }


def _format_metric_block(label: str, metrics: dict[str, int]) -> str:
    execution_rate = (
        round((metrics["actualExpense"] / metrics["planBudget"]) * 100)
        if metrics["planBudget"] > 0
        else 0
    )
    lines = [
        f"【{label}】",
        (
            f"· 계획: 인원 {metrics['planPeople']:,}명, 횟수 {metrics['planCount']:,}회, "
            f"예산 {_format_won(metrics['planBudget'])}"
        ),
        (
            f"· 실적: 인원 {metrics['actualPeople']:,}명, 횟수 {metrics['actualCount']:,}회, "
            f"지출 {_format_won(metrics['actualExpense'])}"
        ),
    ]
    if metrics["planBudget"] > 0:
        lines.append(f"· 예산 집행률: {execution_rate}%")
    return "\n".join(lines)


def _parse_month(text: str) -> str | None:
    match = MONTH_PATTERN.search(text)
    if not match:
        return None
    return f"{int(match.group(1))}월"


def _find_sub_project(text: str, snapshot: dict[str, Any]) -> str | None:
    normalized = text.replace(" ", "")
    for name in snapshot["performance"]["subProjects"]:
        if name.replace(" ", "") in normalized:
            return name
    return None


def _is_aggregate_query(text: str) -> bool:
    return bool(re.search(r"총|합계|전체|요약|현황|집계|몇\s*개|얼마|알려|보여|정리", text))


def _match_domain(text: str) -> dict[str, bool]:
    return {
        "performance": bool(
            re.search(r"실적|계획|예산|지출|세목|세세목|추경|원천|입력관리", text)
        ),
        "dashboard": bool(re.search(r"대시보드|달성률|인원\s*현황|프로젝트|서비스\s*이용", text)),
        "kanban": bool(re.search(r"칸반|업무|태스크|카드|보드", text)),
        "organization": bool(re.search(r"조직|직원|부서|인사", text)),
        "ebooks": bool(re.search(r"전자책|ebook|자료실|도서", text)),
        "survey": bool(re.search(r"설문|만족도", text)),
    }


def _answer_help() -> dict[str, Any]:
    return {
        "sources": ["help"],
        "content": "\n".join(
            [
                "봄이봇 데이터 어시스턴트입니다. 아래처럼 질문해 보세요.",
                "",
                "· 전체 요약: 「실적 데이터 전체 요약해줘」",
                "· 월별: 「5월 계획·실적 합계는?」",
                "· 세목별: 「온라인홍보 실적 알려줘」",
                "· 대시보드: 「대시보드 현황 요약」",
                "· 칸반: 「칸반 업무 몇 개야?」",
                "",
                "여러 영역을 한 번에 묻으면 통합 요약으로 답변합니다.",
            ]
        ),
    }


def _answer_greeting(snapshot: dict[str, Any]) -> dict[str, Any]:
    performance = snapshot["performance"]
    kanban = snapshot["kanban"]
    surveys = snapshot["surveys"]
    return {
        "sources": ["aggregate", "help"],
        "content": "\n".join(
            [
                "안녕하세요! 저장된 사업 데이터를 바탕으로 답변드립니다.",
                "",
                (
                    f"현재 연결된 데이터 기준: 실적 입력 {performance['rowCount']}건, "
                    f"칸반 업무 {kanban['taskCount']}건, 설문 {surveys['totalCount']}건."
                ),
                "궁금한 항목을 자연어로 물어보시거나 아래 추천 질문을 눌러 보세요.",
            ]
        ),
    }


def _month_entries(snapshot: dict[str, Any]) -> list[tuple[str, dict[str, int]]]:
    return sorted(
        snapshot["performance"]["byMonth"].items(),
        key=lambda item: int(item[0].replace("월", "")),
    )


def _answer_performance_aggregate(snapshot: dict[str, Any]) -> dict[str, Any]:
    performance = snapshot["performance"]
    lines = [
        "계획/실적 입력 데이터 전체 집계입니다.",
        "",
        _format_metric_block("전체", performance["totals"]),
        "",
        "월별 계획 예산 상위:",
    ]
    for month, metrics in _month_entries(snapshot):
        if metrics["planBudget"] > 0 or metrics["actualExpense"] > 0:
            lines.append(
                f"· {month}: 계획 {_format_won(metrics['planBudget'])} / "
                f"실적 {_format_won(metrics['actualExpense'])}"
            )
            if len([l for l in lines if l.startswith("· ")]) >= 6:
                break
    sub_projects = performance["subProjects"]
    suffix = " …" if len(sub_projects) > 8 else ""
    lines.extend(
        [
            "",
            f"세목 {len(sub_projects)}개: {', '.join(sub_projects[:8])}{suffix}",
        ]
    )
    return {"sources": ["aggregate", "performance"], "content": "\n".join(lines)}


def _answer_performance_month(month: str, snapshot: dict[str, Any]) -> dict[str, Any]:
    metrics = snapshot["performance"]["byMonth"].get(month, _empty_metrics())
    if (
        metrics["planBudget"] == 0
        and metrics["actualExpense"] == 0
        and metrics["planPeople"] == 0
    ):
        return {
            "sources": ["performance"],
            "content": (
                f"{month}에 등록된 계획/실적 데이터가 없습니다. "
                "입력관리 탭에서 해당 월 행을 추가해 주세요."
            ),
        }
    return {
        "sources": ["performance"],
        "content": "\n".join(
            [f"{month} 계획/실적 집계입니다.", "", _format_metric_block(month, metrics)]
        ),
    }


def _answer_performance_sub_project(
    sub_project: str, snapshot: dict[str, Any]
) -> dict[str, Any]:
    metrics = snapshot["performance"]["bySubProject"].get(sub_project)
    if not metrics:
        subs = ", ".join(snapshot["performance"]["subProjects"])
        return {
            "sources": ["performance"],
            "content": f"「{sub_project}」 세목 데이터를 찾지 못했습니다. 등록된 세목: {subs}",
        }
    return {
        "sources": ["performance"],
        "content": "\n".join(
            [
                f"세부사업명(세목) 「{sub_project}」 기준 집계입니다.",
                "",
                _format_metric_block(sub_project, metrics),
            ]
        ),
    }


def _answer_dashboard(snapshot: dict[str, Any]) -> dict[str, Any]:
    stat_lines = [
        f"· {item['label']}: {item['value']}{item['unit']} — {item['description']}"
        for item in snapshot["dashboard"]["stats"]
    ]
    progress_lines = [
        f"· {item['label']}: {item['value']}%" for item in snapshot["dashboard"]["progress"]
    ]
    return {
        "sources": ["dashboard", "aggregate"],
        "content": "\n".join(
            [
                "대시보드 요약입니다.",
                "",
                "주요 지표:",
                *stat_lines,
                "",
                "달성/집행률:",
                *progress_lines,
            ]
        ),
    }


def _answer_kanban(snapshot: dict[str, Any]) -> dict[str, Any]:
    status_lines = [
        f"· {status}: {count}건"
        for status, count in snapshot["kanban"]["tasksByStatus"].items()
    ]
    return {
        "sources": ["kanban"],
        "content": "\n".join(
            [
                "칸반 보드 데이터입니다.",
                "",
                f"· 활성 프로젝트: {snapshot['kanban']['projectCount']}개",
                f"· 전체 업무 카드: {snapshot['kanban']['taskCount']}건",
                "",
                "단계별:",
                *status_lines,
            ]
        ),
    }


def _answer_organization(snapshot: dict[str, Any]) -> dict[str, Any]:
    org = snapshot["organization"]
    return {
        "sources": ["organization"],
        "content": "\n".join(
            [
                "조직/인사 데이터 요약입니다.",
                "",
                f"· 부서 수: {org['departmentCount']}개",
                f"· 등록 직원: {org['employeeCount']}명",
                "",
                "상세 명단은 「조직」 메뉴에서 확인할 수 있습니다.",
            ]
        ),
    }


def _answer_ebooks(snapshot: dict[str, Any]) -> dict[str, Any]:
    ebooks = snapshot["ebooks"]
    return {
        "sources": ["ebooks"],
        "content": "\n".join(
            [
                "전자책/자료실 데이터입니다.",
                "",
                f"· 등록 자료: {ebooks['bookCount']}권",
                f"· 카테고리: {', '.join(ebooks['categories'])}",
            ]
        ),
    }


def _answer_surveys(snapshot: dict[str, Any]) -> dict[str, Any]:
    surveys = snapshot["surveys"]
    lines = [
        "설문 데이터입니다.",
        "",
        f"· 설문 수: {surveys['totalCount']}개",
    ]
    if surveys["titles"]:
        lines.append(f"· 목록: {', '.join(surveys['titles'])}")
    return {"sources": ["survey"], "content": "\n".join(lines)}


def _answer_full_aggregate(snapshot: dict[str, Any]) -> dict[str, Any]:
    parts = [
        _answer_performance_aggregate(snapshot)["content"],
        "",
        "---",
        "",
        _answer_dashboard(snapshot)["content"],
        "",
        "---",
        "",
        _answer_kanban(snapshot)["content"],
    ]
    return {
        "sources": ["aggregate", "performance", "dashboard", "kanban"],
        "content": "\n".join(parts),
    }


def answer_assistant_question(question: str, snapshot: dict[str, Any]) -> dict[str, Any]:
    text = question.strip()
    if not text:
        return _answer_help()

    if re.match(r"^(안녕|하이|hello|hi|도움|help)", text, re.IGNORECASE):
        return _answer_greeting(snapshot)

    domains = _match_domain(text)
    aggregate = _is_aggregate_query(text)
    month = _parse_month(text)
    sub_project = _find_sub_project(text, snapshot)

    if (
        aggregate
        and not domains["kanban"]
        and not domains["dashboard"]
        and not domains["organization"]
        and not domains["ebooks"]
        and not domains["survey"]
        and (domains["performance"] or re.search(r"실적|계획|예산|사업", text))
    ):
        if re.search(r"전체|요약|집계|총괄|통합|모두|다", text):
            return _answer_full_aggregate(snapshot)
        return _answer_performance_aggregate(snapshot)

    if month and (domains["performance"] or aggregate or re.search(r"실적|계획|예산", text)):
        return _answer_performance_month(month, snapshot)

    if sub_project:
        return _answer_performance_sub_project(sub_project, snapshot)

    if domains["dashboard"]:
        return _answer_dashboard(snapshot)
    if domains["kanban"]:
        return _answer_kanban(snapshot)
    if domains["organization"]:
        return _answer_organization(snapshot)
    if domains["ebooks"]:
        return _answer_ebooks(snapshot)
    if domains["survey"]:
        return _answer_surveys(snapshot)
    if domains["performance"]:
        return _answer_performance_aggregate(snapshot)

    if aggregate:
        return _answer_full_aggregate(snapshot)

    return {
        "sources": ["help"],
        "content": "\n".join(
            [
                "질문을 이해하지 못했습니다. 데이터 범위를 조금 더 구체적으로 적어 주세요.",
                "",
                "예: 「5월 실적 예산 합계」, 「온라인홍보 실적」, 「대시보드 요약」, 「칸반 업무 수」",
            ]
        ),
    }
