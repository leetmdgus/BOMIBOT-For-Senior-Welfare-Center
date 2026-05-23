# `lib/` — 공유 유틸·목업 시드·서버 로직

UI 컴포넌트는 **`services/*.service.ts` facade** 만 import 합니다. (`lib/mocks` 직접 import 금지 — 예외: Route Handler·`*.mock.service.ts`)

## 디렉터리

| 경로 | 역할 |
|------|------|
| `lib/mocks/` | 정적 시드 데이터 (단일 출처). 도메인별 `*.mock.ts` |
| `lib/chat/` | 데이터 챗봇·온톨로지·CS 메일 (서버 전용 로직) |
| `lib/kanban/` | 칸반 UI 헬퍼 (`filter-kanban-projects`, `evaluation-save-payload` 등) |
| `lib/evaluation-document-preview.ts` | 평가 참고 문서 미리보기 HTML 생성 |
| `lib/constants/` | 브랜드 상수 |
| `utils.ts` | `cn()` 등 공통 유틸 |
| `survey-theme.ts` | 설문 테마 |

## `lib/chat/` 파이프라인

```
질문
  → resolveOntologyForQuestion (query-graph)
  → 서브그래프 + contextText
  → answerWithAssistantLlm (GEMINI) 또는 answerFromKnowledgeGraph / assistant-engine
```

| 모듈 | 설명 |
|------|------|
| `assistant-data.ts` | mock 집계 → `AssistantDataSnapshot` |
| `assistant-engine.ts` | 규칙 기반 답변 |
| `assistant-llm.ts` | Gemini 게이트웨이 (OpenAI SDK) |
| `assistant-server.ts` | LLM + 온톨로지 + 규칙 폴백 진입점 |
| `cs-email.ts` | nodemailer SMTP 발송 |
| `cs-ticket.ts` | 티켓 ID·SMTP 분기 |
| `ontology/build-graph.ts` | mock → `KnowledgeGraph` |
| `ontology/query-graph.ts` | 질문 → 서브그래프·추론 경로 |
| `ontology/answer-from-graph.ts` | 그래프 규칙 답변 |

서버 진입: `services/chat.server.service.ts` · 클라이언트: `services/chat.service.ts`

## 환경 변수 (챗봇)

| 변수 | 용도 |
|------|------|
| `GEMINI_API_KEY` | 데이터 어시스턴트 LLM |
| `GEMINI_BASE_URL` | 게이트웨이 URL (선택) |
| `GEMINI_MODEL` | 모델명 (기본 `gemini-2.0-flash`) |
| `SMTP_USER` / `SMTP_PASS` | CS 메일 발송 |
| `CS_EMAIL_TO` | CS 수신 주소 |

자세한 API: [docs/API_SPEC.md](../docs/API_SPEC.md)
