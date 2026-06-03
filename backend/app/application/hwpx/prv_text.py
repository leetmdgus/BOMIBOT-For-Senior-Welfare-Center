"""Preview/PrvText.txt — section0와 동일 데이터로 생성 (한글 변조 검사 대응)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.application.hwpx.encoding import prv_safe_value, slot_lines
from app.application.hwpx.section0_template_fill import _goals_text, plan_purpose_text


def _pair(label: str, value: str) -> str:
    return f"<{label}><{prv_safe_value(value)}>"


def _prv_eval_date(iso: str) -> str:
    if not (iso or "").strip():
        return ""
    try:
        normalized = iso.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).strftime("%Y-%m-%d")
    except ValueError:
        return iso


def _editor_tail_lines() -> list[str]:
    return [
        " <대목차><>",
        "<목차><>",
        *("<본문><>" for _ in range(8)),
    ]


def build_evaluation_prv_text(
    evaluation: dict[str, Any],
    plan_form: dict[str, Any] | None = None,
    *,
    title: str = "",
) -> str:
    """사업평가서 템플릿 PrvText 형식 (한 쌍당 라벨+값, 행마다 2쌍)."""
    goals = _goals_text(evaluation.get("goals") or [])
    doc_title = title or (
        f"{evaluation.get('programName') or ''} 최종사업평가서".strip()
        or "최종사업평가서"
    )
    lines = [
        _pair("사업팀", str(evaluation.get("team") or ""))
        + _pair("담당자", str(evaluation.get("manager") or "")),
        _pair("사업기간", str(evaluation.get("period") or ""))
        + _pair("평가일", _prv_eval_date(str(evaluation.get("evaluationDate") or ""))),
        _pair("프로그램명", str(evaluation.get("programName") or ""))
        + _pair("대상", str(evaluation.get("target") or "")),
        _pair("계획 인원(명/회)", str(evaluation.get("planCount") or ""))
        + _pair("예산(원)", str(evaluation.get("planBudget") or "")),
        _pair("실행 인원(명/회)", str(evaluation.get("actualCount") or ""))
        + _pair("지출(원)", str(evaluation.get("actualExpense") or "")),
        _pair("목적", slot_lines(str(evaluation.get("purpose") or "")) or "-")
        + _pair("목표", goals),
        _pair("성과지표", slot_lines(str(evaluation.get("performanceIndicator") or "")))
        + _pair("평가도구", slot_lines(str(evaluation.get("evaluationTool") or ""))),
        _pair("프로그램 평가", "성과 주요 요인 분석")
        + _pair("", slot_lines(str(evaluation.get("keyFactorAnalysis") or "")))
        + _pair("목표 적절성", slot_lines(str(evaluation.get("goalAppropriacy") or "")))
        + _pair("제언 및 향후 계획", slot_lines(str(evaluation.get("suggestion") or ""))),
        "<슈퍼비전>",
        f"<>{doc_title}",
        *_editor_tail_lines(),
    ]
    if plan_form:
        # 참고 계획서 표는 PrvText에 별도 블록 없음 — 인쇄 영역만 동기화
        pass
    return "\r\n".join(lines)


def build_plan_prv_text(form: dict[str, Any], *, title: str = "") -> str:
    """사업계획서 템플릿 PrvText 형식."""
    goals = _goals_text(form.get("goals") or [])
    doc_title = title or str(form.get("projectName") or "사업계획서")
    lines = [
        _pair("사 업 명", str(form.get("projectName") or "")),
        _pair("목 적", plan_purpose_text(form)),
        _pair("목 표", goals),
        _pair("사 업 기 간", str(form.get("period") or "")),
        _pair("사 업 대 상", str(form.get("target") or "")),
        _pair("연 인 원 수 / 횟 수", str(form.get("totalCount") or "")),
        _pair("소 요 예 산", str(form.get("budget") or "")),
        _pair("예 산 과 목", str(form.get("budgetCategory") or "")),
        _pair("담 당", str(form.get("manager") or "")),
        "<세부사업>",
        _pair("세부사업명", "내용"),
    ]
    sub_projects = form.get("subProjects") or []
    for i, proj in enumerate(sub_projects[:4]):
        name = str((proj or {}).get("name") or "")
        body = "\n".join(
            x
            for x in (
                str((proj or {}).get("output") or "").strip(),
                str((proj or {}).get("outcome") or "").strip(),
            )
            if x
        )
        if name:
            pair = _pair(name, body)
            if i == len(sub_projects[:4]) - 1:
                pair += doc_title
            lines.append(pair)
    if not sub_projects:
        lines.append(f"<>{doc_title}")
    lines.extend(_editor_tail_lines())
    return "\r\n".join(lines)
