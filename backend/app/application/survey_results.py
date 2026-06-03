"""설문 응답 집계 — 결과 탭·칸반 통계용."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

MATRIX_BUCKETS = ("매우불만족", "불만족", "보통", "만족", "매우만족")
# 만족도 척도 최대 점수 — 프론트 SURVEY_SCALE_MAX, `_scale_score`(1~5)와 동일.
SCALE_MAX = 5
# 5점 척도 만족도 가중치 (매트릭스 버킷 → 점수)
BUCKET_WEIGHT = {"매우불만족": 1, "불만족": 2, "보통": 3, "만족": 4, "매우만족": 5}
# 4점(만족) 이상을 긍정 응답(top-box)으로 집계
POSITIVE_THRESHOLD = 4
PIE_COLORS = (
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#64748b",
    "#06b6d4",
    "#ec4899",
)


def _parse_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    if isinstance(value, int):
        return value
    text = str(value).strip().replace(",", "")
    if not text:
        return default
    try:
        return int(float(text))
    except ValueError:
        return default


def _answer_map(payload: dict) -> dict[str, dict]:
    answers = payload.get("answers") or []
    return {
        str(item.get("questionId")): item.get("answer") or {}
        for item in answers
        if item.get("questionId")
    }


def _scale_score(value: Any) -> float | None:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return None
    if 1 <= score <= 5:
        return score
    return None


def _matrix_bucket(label: str) -> str | None:
    normalized = str(label).strip()
    if normalized in MATRIX_BUCKETS:
        return normalized
    for bucket in MATRIX_BUCKETS:
        if bucket in normalized:
            return bucket
    return None


def build_survey_results(
    survey_id: str,
    detail: dict,
    responses: list[dict],
    *,
    list_item: dict | None = None,
) -> dict:
    questions = list(detail.get("questions") or [])
    total_responses = len(responses)
    overview = detail.get("overview") or {}
    total_target = _parse_int(
        overview.get("sampleCount"),
        (list_item or {}).get("totalTarget") or 0,
    )
    if total_target <= 0 and total_responses > 0:
        total_target = max(total_responses, 30)

    scale_scores: list[float] = []
    matrix_scores: list[float] = []
    question_results: list[dict] = []

    for question in questions:
        qid = str(question.get("id") or "")
        qtype = str(question.get("type") or "text")
        title = str(question.get("title") or "")
        answered = 0
        skipped = 0

        for response in responses:
            answers = _answer_map(response)
            answer = answers.get(qid)
            if not answer:
                skipped += 1
                continue
            if qtype == "text":
                if str(answer.get("value") or "").strip():
                    answered += 1
                else:
                    skipped += 1
            elif qtype == "scale":
                if _scale_score(answer.get("value")) is not None:
                    answered += 1
                else:
                    skipped += 1
            elif qtype == "choice":
                value = answer.get("value")
                if isinstance(value, list) and value:
                    answered += 1
                elif isinstance(value, str) and value.strip():
                    answered += 1
                else:
                    skipped += 1
            elif qtype == "matrix":
                matrix = answer.get("value") or {}
                rows = question.get("rows") or []
                if rows:
                    if all(str(matrix.get(row) or "").strip() for row in rows):
                        answered += 1
                    else:
                        skipped += 1
                elif matrix:
                    answered += 1
                else:
                    skipped += 1
            else:
                skipped += 1

        result: dict[str, Any] = {
            "questionId": qid,
            "type": qtype,
            "title": title,
            "subtitle": question.get("description") or "",
            "answeredCount": answered,
            "skippedCount": skipped,
        }

        if qtype == "matrix":
            rows = question.get("rows") or []
            columns = question.get("columns") or list(MATRIX_BUCKETS)
            chart_rows: list[dict] = []
            question_weights: list[float] = []
            for row_name in rows:
                counts = {bucket: 0 for bucket in MATRIX_BUCKETS}
                for response in responses:
                    answers = _answer_map(response)
                    answer = answers.get(qid)
                    if not answer or answer.get("type") != "matrix":
                        continue
                    cell = (answer.get("value") or {}).get(row_name)
                    bucket = _matrix_bucket(str(cell or ""))
                    if bucket:
                        counts[bucket] += 1
                        question_weights.append(float(BUCKET_WEIGHT[bucket]))
                    elif str(cell or "").strip() in columns:
                        counts[str(cell).strip()] = counts.get(str(cell).strip(), 0) + 1
                chart_rows.append({"name": row_name, **counts})
            result["matrixChart"] = chart_rows
            if question_weights:
                result["average"] = round(
                    sum(question_weights) / len(question_weights), 2
                )
            matrix_scores.extend(question_weights)

        elif qtype == "choice":
            option_counts: Counter[str] = Counter()
            other_texts: list[str] = []
            for response in responses:
                answers = _answer_map(response)
                answer = answers.get(qid)
                if not answer or answer.get("type") != "choice":
                    continue
                value = answer.get("value")
                if isinstance(value, list):
                    for item in value:
                        if item == "__other__":
                            if answer.get("other"):
                                other_texts.append(str(answer["other"]))
                            option_counts["기타"] += 1
                        else:
                            option_counts[str(item)] += 1
                elif value == "__other__":
                    option_counts["기타"] += 1
                    if answer.get("other"):
                        other_texts.append(str(answer["other"]))
                elif value:
                    option_counts[str(value)] += 1

            options = question.get("options") or []
            pie_data: list[dict] = []
            keys = list(options) if options else list(option_counts.keys())
            if "기타" not in keys and option_counts.get("기타"):
                keys.append("기타")
            for index, name in enumerate(keys):
                pie_data.append(
                    {
                        "name": name,
                        "value": option_counts.get(name, 0),
                        "color": PIE_COLORS[index % len(PIE_COLORS)],
                    }
                )
            result["pieData"] = pie_data
            if other_texts:
                result["otherText"] = other_texts[-1]
                result["otherCount"] = len(other_texts)

        elif qtype == "text":
            texts: list[dict] = []
            for index, response in enumerate(responses):
                answers = _answer_map(response)
                answer = answers.get(qid)
                if not answer or answer.get("type") != "text":
                    continue
                text = str(answer.get("value") or "").strip()
                if not text:
                    continue
                texts.append(
                    {
                        "id": f"t{index + 1}",
                        "text": text,
                        "votes": 1,
                    }
                )
            result["textResponses"] = texts

        elif qtype == "scale":
            question_scores: list[float] = []
            for response in responses:
                answers = _answer_map(response)
                answer = answers.get(qid)
                if not answer or answer.get("type") != "scale":
                    continue
                score = _scale_score(answer.get("value"))
                if score is not None:
                    scale_scores.append(score)
                    question_scores.append(score)
            counts = {score: 0 for score in range(1, SCALE_MAX + 1)}
            for score in question_scores:
                bucket = int(round(score))
                if bucket in counts:
                    counts[bucket] += 1
            result["scaleData"] = [
                {"score": score, "count": counts[score]}
                for score in range(1, SCALE_MAX + 1)
            ]
            if question_scores:
                result["average"] = round(
                    sum(question_scores) / len(question_scores), 2
                )

        question_results.append(result)

    # 척도형 응답이 있으면 척도 평균, 없으면 매트릭스 가중 평균을 만족도로 사용
    satisfaction_points = scale_scores or matrix_scores
    average = (
        round(sum(satisfaction_points) / len(satisfaction_points), 2)
        if satisfaction_points
        else 0.0
    )

    # 긍정 응답률(top-box): 척도+매트릭스 만족도 점수 중 4점 이상 비율
    all_points = scale_scores + matrix_scores
    positive_count = sum(1 for point in all_points if point >= POSITIVE_THRESHOLD)
    positive_rate = (
        round(positive_count / len(all_points) * 100) if all_points else 0
    )

    completion = (
        round((total_responses / total_target) * 100) if total_target else 0
    )

    return {
        "surveyId": survey_id,
        "summary": {
            "totalResponses": total_responses,
            "totalTarget": total_target,
            "averageSatisfaction": average,
            "completionRate": min(completion, 100),
            "positiveRate": min(positive_rate, 100),
        },
        "questions": question_results,
    }
