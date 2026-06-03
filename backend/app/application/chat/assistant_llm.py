"""OpenAI-compatible Gemini gateway for assistant answers."""

from __future__ import annotations

import re
from typing import Any

import httpx

from app.application.chat.assistant_context import format_assistant_data_context
from app.core.config import Settings

VALID_SOURCES = {
    "aggregate",
    "rag",
    "performance",
    "dashboard",
    "kanban",
    "organization",
    "ebooks",
    "survey",
    "documents",
    "help",
}


def is_assistant_llm_configured(settings: Settings) -> bool:
    return bool((settings.gemini_api_key or "").strip())


def _parse_sources(text: str) -> list[str]:
    match = re.search(r"\[출처:\s*([^\]]+)\]\s*$", text, re.IGNORECASE | re.MULTILINE)
    if not match:
        return ["rag"]
    parsed = []
    for part in re.split(r"[·,|/]", match.group(1)):
        key = part.strip().lower()
        if key in VALID_SOURCES:
            parsed.append(key)
    return parsed or ["rag"]


def _strip_source_line(text: str) -> str:
    return re.sub(r"\n?\[출처:\s*[^\]]+\]\s*$", "", text, flags=re.IGNORECASE | re.MULTILINE).strip()


async def answer_with_rag_llm(
    settings: Settings,
    question: str,
    snapshot: dict[str, Any],
    rag: dict[str, Any],
) -> dict[str, Any]:
    api_key = (settings.gemini_api_key or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY가 설정되지 않았습니다.")

    base_url = (settings.gemini_base_url or "https://factchat-cloud.mindlogic.ai/v1/gateway").rstrip(
        "/"
    )
    model = settings.gemini_model or "gemini-2.0-flash"
    data_context = format_assistant_data_context(snapshot)

    system_prompt = f"""당신은 봄이봇(BOMIBOT) 사업관리 플랫폼의 데이터 어시스턴트입니다.
질문에 답할 때 RAG(검색 증강)로 찾은 문서 조각과 시스템 데이터를 함께 사용합니다.

규칙:
1. 「RAG 검색 결과」를 우선 근거로 하고, 필요 시 「시스템 데이터」와 대조합니다.
2. 검색 결과에 없는 수치는 추측하지 말고 없다고 말합니다.
3. 금액은 원(₩) 단위, 천 단위 구분(,)을 사용합니다.
4. 답변 맨 마지막 줄: [출처: rag, performance, dashboard] 형식
<<<<<<< HEAD
   사용 키: aggregate, rag, performance, dashboard, kanban, organization, ebooks, survey
=======
   사용 키: aggregate, rag, performance, dashboard, kanban, organization, ebooks, survey, documents
>>>>>>> dev2

{rag.get("contextText", "")}

=== 시스템 데이터 ===
{data_context}"""

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "temperature": 0.2,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question},
                ],
            },
        )
        response.raise_for_status()
        payload = response.json()

    raw = (
        payload.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    ) or "답변을 생성하지 못했습니다. 다시 질문해 주세요."

    rag_sources = list({c.get("source") for c in rag.get("chunks", []) if c.get("source")})
    sources = list(dict.fromkeys(_parse_sources(raw) + rag_sources))

    return {
        "content": _strip_source_line(raw),
        "sources": sources,
    }
