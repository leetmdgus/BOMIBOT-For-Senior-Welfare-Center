"""Knowledge graph query (parity with frontend lib/chat/ontology/query-graph.ts)."""

from __future__ import annotations

import re
from typing import Any

DOMAIN_KEYWORDS: dict[str, str] = {
    "performance": "domain:performance",
    "실적": "domain:performance",
    "계획": "domain:performance",
    "예산": "domain:performance",
    "세목": "domain:performance",
    "세세목": "domain:performance",
    "입력관리": "domain:performance",
    "dashboard": "domain:dashboard",
    "대시보드": "domain:dashboard",
    "달성률": "domain:dashboard",
    "집행": "domain:dashboard",
    "kanban": "domain:kanban",
    "칸반": "domain:kanban",
    "업무": "domain:kanban",
    "태스크": "domain:kanban",
    "organization": "domain:organization",
    "조직": "domain:organization",
    "직원": "domain:organization",
    "부서": "domain:organization",
    "ebooks": "domain:ebooks",
    "전자책": "domain:ebooks",
    "자료": "domain:ebooks",
    "survey": "domain:survey",
    "설문": "domain:survey",
    "만족도": "domain:survey",
}

DOMAIN_NODE_IDS = {
    "performance": "domain:performance",
    "dashboard": "domain:dashboard",
    "kanban": "domain:kanban",
    "organization": "domain:organization",
    "ebooks": "domain:ebooks",
    "survey": "domain:survey",
}

PREDICATE_LABELS = {
    "hasDomain": "도메인",
    "hasSubProject": "세목",
    "hasTimePeriod": "기간",
    "hasMetric": "지표",
    "relatedTo": "연관",
    "partOf": "포함",
    "instanceOf": "유형",
}

MONTH_PATTERN = re.compile(r"(\d{1,2})\s*월")


def _normalize(text: str | None) -> str:
    if not text:
        return ""
    return text.lower().replace(" ", "")


def _score_node(node: dict[str, Any], question: str) -> int:
    q = _normalize(question)
    score = 0
    label_norm = _normalize(node.get("label"))
    if label_norm and label_norm in q:
        score += 10
    for alias in node.get("aliases") or []:
        if _normalize(alias) in q:
            score += 6
    if node.get("type") == "TimePeriod" and node.get("label"):
        if _normalize(node["label"]) in q:
            score += 12
    props = node.get("properties") or {}
    for value in props.values():
        if isinstance(value, str) and len(_normalize(value)) > 2:
            if _normalize(value) in q:
                score += 4
    return score


def _expand_subgraph(
    graph: dict[str, Any], seed_ids: list[str], depth: int = 2
) -> dict[str, Any]:
    visited = set(seed_ids)
    queue = [(node_id, 0) for node_id in seed_ids]

    while queue:
        current_id, current_depth = queue.pop(0)
        if current_depth >= depth:
            continue
        for edge in graph.get("edges", []):
            nxt = None
            if edge.get("source") == current_id:
                nxt = edge.get("target")
            elif edge.get("target") == current_id:
                nxt = edge.get("source")
            if not nxt or nxt in visited:
                continue
            visited.add(nxt)
            queue.append((nxt, current_depth + 1))

    nodes = [n for n in graph.get("nodes", []) if n.get("id") in visited]
    node_set = {n["id"] for n in nodes}
    edges = [
        e
        for e in graph.get("edges", [])
        if e.get("source") in node_set and e.get("target") in node_set
    ]
    return {"nodes": nodes, "edges": edges}


def _build_reasoning_paths(graph: dict[str, Any], seed_ids: list[str]) -> list[str]:
    paths: list[str] = []
    seen: set[str] = set()
    nodes_by_id = {n["id"]: n for n in graph.get("nodes", [])}

    for seed_id in seed_ids[:8]:
        seed = nodes_by_id.get(seed_id)
        if not seed:
            continue
        out_edges = [e for e in graph.get("edges", []) if e.get("source") == seed_id]
        for edge in out_edges[:3]:
            target = nodes_by_id.get(edge.get("target", ""))
            if not target:
                continue
            pred = PREDICATE_LABELS.get(edge.get("predicate", ""), edge.get("predicate"))
            line = f"{seed.get('label')} —[{pred}]→ {target.get('label')}"
            if line not in seen:
                seen.add(line)
                paths.append(line)
    return paths


def _format_context(
    graph: dict[str, Any],
    subgraph: dict[str, Any],
    reasoning_paths: list[str],
) -> str:
    hierarchy = graph.get("classHierarchy") or {}
    class_lines = [
        f"  - {cls} ⊂ {parent or '—'}"
        for cls, parent in hierarchy.items()
        if parent in ("Platform", "Domain")
    ][:12]

    node_lines = []
    for node in subgraph.get("nodes", []):
        props = node.get("properties") or {}
        prop_text = ", ".join(f"{k}={v}" for k, v in props.items())
        suffix = f" {{{prop_text}}}" if prop_text else ""
        node_lines.append(f"  [{node.get('type')}] {node.get('label')} (id={node.get('id')}){suffix}")

    nodes_by_id = {n["id"]: n for n in graph.get("nodes", [])}
    edge_lines = []
    for edge in subgraph.get("edges", []):
        src = nodes_by_id.get(edge.get("source", ""), {}).get("label", edge.get("source"))
        tgt = nodes_by_id.get(edge.get("target", ""), {}).get("label", edge.get("target"))
        pred = PREDICATE_LABELS.get(edge.get("predicate", ""), edge.get("predicate"))
        edge_lines.append(f"  ({src}) —{pred}→ ({tgt})")

    return "\n".join(
        [
            "=== 온톨로지 지식 그래프 (TBox 일부) ===",
            *class_lines,
            "",
            (
                f"=== 질문 관련 서브그래프 (노드 {len(subgraph.get('nodes', []))}, "
                f"관계 {len(subgraph.get('edges', []))}) ==="
            ),
            *node_lines[:40],
            *(["  … 외 노드"] if len(node_lines) > 40 else []),
            "",
            "=== 관계 트리플 ===",
            *edge_lines[:35],
            *(["  … 외 관계"] if len(edge_lines) > 35 else []),
            "",
            "=== 그래프 추론 경로 ===",
            *([f"  · {p}" for p in reasoning_paths] if reasoning_paths else ["  · (직접 연결 경로 없음)"]),
        ]
    )


def query_knowledge_graph(question: str, graph: dict[str, Any]) -> dict[str, Any]:
    q = question.strip()
    scored = sorted(
        (
            {"node": node, "score": _score_node(node, q)}
            for node in graph.get("nodes", [])
        ),
        key=lambda item: item["score"],
        reverse=True,
    )
    scored = [item for item in scored if item["score"] > 0]

    domain_seeds: list[str] = []
    normalized_q = _normalize(q)
    for keyword, domain_id in DOMAIN_KEYWORDS.items():
        if _normalize(keyword) in normalized_q:
            domain_seeds.append(domain_id)

    for match in MONTH_PATTERN.finditer(q):
        month = f"{int(match.group(1))}월"
        month_node = next(
            (
                n
                for n in graph.get("nodes", [])
                if n.get("type") == "TimePeriod" and n.get("label") == month
            ),
            None,
        )
        if month_node:
            scored.append({"node": month_node, "score": 20})

    if re.search(r"전체|요약|통합|집계|총|모든", q):
        domain_seeds.extend(
            [
                DOMAIN_NODE_IDS["performance"],
                DOMAIN_NODE_IDS["dashboard"],
                DOMAIN_NODE_IDS["kanban"],
            ]
        )

    top_ids = list(
        dict.fromkeys(
            domain_seeds + [item["node"]["id"] for item in scored[:12]]
        )
    )

    if not top_ids:
        top_ids = [
            DOMAIN_NODE_IDS["performance"],
            DOMAIN_NODE_IDS["dashboard"],
            "platform:bomibot",
        ]

    depth = 2 if re.search(r"전체|요약|통합|관계|그래프|연결", q) else 1
    subgraph = _expand_subgraph(graph, top_ids, depth)
    reasoning_paths = _build_reasoning_paths(graph, top_ids)

    return {
        "matchedNodeIds": top_ids,
        "subgraph": subgraph,
        "reasoningPaths": reasoning_paths,
        "contextText": _format_context(graph, subgraph, reasoning_paths),
    }
