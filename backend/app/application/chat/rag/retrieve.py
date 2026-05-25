from __future__ import annotations

from typing import Any

from app.application.chat.rag.corpus import tokenize_for_search


def _score_chunk(query_tokens: list[str], chunk: dict[str, Any]) -> int:
    if not query_tokens:
        return 0
    haystack = f"{chunk.get('title', '')} {chunk.get('text', '')}".lower()
    score = 0
    for token in query_tokens:
        if token in haystack:
            score += 3 if len(token) >= 4 else 2
        if token in chunk.get("title", "").lower():
            score += 2
    return score


def retrieve_rag_chunks(
    question: str,
    corpus: list[dict[str, Any]],
    top_k: int = 8,
) -> list[dict[str, Any]]:
    query_tokens = tokenize_for_search(question)
    min_score = 2 if query_tokens else 0

    ranked = sorted(
        (
            {"chunk": c, "score": _score_chunk(query_tokens, c)}
            for c in corpus
        ),
        key=lambda item: item["score"],
        reverse=True,
    )
    ranked = [item for item in ranked if item["score"] >= min_score]

    selected = ranked[:top_k] if ranked else [
        {"chunk": c, "score": 0} for c in corpus[: min(top_k, len(corpus))]
    ]

    return [{**item["chunk"], "score": item["score"]} for item in selected]


def format_rag_context(chunks: list[dict[str, Any]]) -> str:
    if not chunks:
        return "=== RAG 검색 결과 ===\n(관련 문서를 찾지 못했습니다.)"
    body = "\n\n".join(
        f"[{i + 1}] ({c.get('source')}) {c.get('title')}\n{c.get('text')}"
        for i, c in enumerate(chunks)
    )
    return f"=== RAG 검색 결과 (상위 {len(chunks)}건) ===\n{body}"
