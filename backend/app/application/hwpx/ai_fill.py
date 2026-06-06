"""AI 자동 채움 — 참고 문서 내용을 읽어 현재 HWPX 양식의 빈 칸을 Gemini로 채운다.

흐름: frontend JSON(양식) → 빈 셀 수집 + 표 구조 텍스트화 → 참고 문서 평문과 함께
Gemini(OpenAI 호환 게이트웨이)에 보내 {빈칸ID: 값} JSON을 받는다. 적용은 프론트에서
사용자가 검토 후 수행(여기서는 제안만 반환, 저장 안 함).
"""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.core.config import Settings

# 참고 문서 평문 길이 상한 (토큰/지연 보호)
_MAX_REFERENCE_CHARS = 24000


def _cell_text(cell: dict[str, Any]) -> str:
    parts: list[str] = []
    for para in cell.get("paragraphs", []) or []:
        for run in para.get("runs", []) or []:
            if run.get("type") == "text_run":
                parts.append(str(run.get("text") or ""))
    return "".join(parts).strip()


def collect_fillable_cells(
    frontend_json: dict[str, Any],
) -> tuple[list[str], str]:
    """빈 셀 ID 목록과, 빈칸 마커를 포함한 표 구조 텍스트를 만든다.

    ID 형식: "{paragraphIndex}.{runIndex}.{row}.{col}" — 프론트가 그대로 적용에 사용.
    """
    field_ids: list[str] = []
    lines: list[str] = []
    paragraphs = (frontend_json.get("document") or {}).get("paragraphs", []) or []

    for p_idx, para in enumerate(paragraphs):
        for r_idx, run in enumerate(para.get("runs", []) or []):
            if run.get("type") != "table":
                continue
            lines.append(f"[표 {p_idx}.{r_idx}]")
            for tr in run.get("rows", []) or []:
                cell_reprs: list[str] = []
                for cell in tr.get("cells", []) or []:
                    row = cell.get("row", 0)
                    col = cell.get("col", 0)
                    text = _cell_text(cell)
                    if text:
                        cell_reprs.append(text)
                    else:
                        cid = f"{p_idx}.{r_idx}.{row}.{col}"
                        field_ids.append(cid)
                        cell_reprs.append(f"[빈칸:{cid}]")
                if cell_reprs:
                    lines.append(" | ".join(cell_reprs))

    return field_ids, "\n".join(lines)


def _parse_json_loose(text: str) -> dict[str, Any]:
    text = (text or "").strip()
    # ```json ... ``` 펜스 제거 후 가장 바깥 중괄호 블록 추출
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


async def _gemini_json(
    settings: Settings, system_prompt: str, user_prompt: str
) -> dict[str, Any]:
    api_key = (settings.gemini_api_key or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY가 설정되지 않았습니다.")

    base_url = (
        settings.gemini_base_url
        or "https://factchat-cloud.mindlogic.ai/v1/gateway"
    ).rstrip("/")
    model = settings.gemini_model or "gemini-2.0-flash"

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "temperature": 0,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        response.raise_for_status()
        payload = response.json()

    content = (
        payload.get("choices", [{}])[0].get("message", {}).get("content", "")
    )
    return _parse_json_loose(content)


async def ai_fill_form(
    settings: Settings,
    frontend_json: dict[str, Any],
    reference_texts: list[str],
) -> dict[str, Any]:
    """양식의 빈 칸을 참고 문서로 채운 제안({fills}) 반환."""
    field_ids, form_repr = collect_fillable_cells(frontend_json)
    if not field_ids:
        return {"fills": {}, "warnings": ["채울 빈 칸을 찾지 못했습니다."], "fieldCount": 0}

    reference = "\n\n".join(reference_texts)[:_MAX_REFERENCE_CHARS]

    system_prompt = (
        "너는 한국어 사업 문서 양식을 채우는 도우미다. "
        "아래 '양식'에서 [빈칸:ID] 위치에 들어갈 값을 '참고 문서' 내용에서 찾아 채운다.\n"
        "규칙:\n"
        "1. 같은 행/주변 라벨을 근거로 어떤 빈칸인지 판단한다.\n"
        "2. 참고 문서에 근거가 없는 빈칸은 결과에서 제외한다(추측 금지).\n"
        "3. 금액은 숫자와 콤마, 날짜는 원문 표기를 따른다.\n"
        '4. 반드시 JSON만 출력한다: {"fills": {"ID": "값", ...}}'
    )
    user_prompt = f"=== 양식 ===\n{form_repr}\n\n=== 참고 문서 ===\n{reference}"

    data = await _gemini_json(settings, system_prompt, user_prompt)

    raw_fills = data.get("fills") if isinstance(data.get("fills"), dict) else {}
    valid_ids = set(field_ids)
    fills: dict[str, str] = {}
    for key, value in (raw_fills or {}).items():
        if key in valid_ids and str(value).strip():
            fills[key] = str(value).strip()

    warnings: list[str] = []
    if not fills:
        warnings.append("AI가 채울 값을 찾지 못했습니다. 참고 문서를 확인해 주세요.")

    return {"fills": fills, "warnings": warnings, "fieldCount": len(field_ids)}
