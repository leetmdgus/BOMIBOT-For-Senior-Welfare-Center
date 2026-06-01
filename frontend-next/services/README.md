# `services/` — 도메인 API Facade

모든 화면은 **`*.service.ts`** 만 import 합니다.

## 패턴

```
components / app
       ↓
*.service.ts          ← NEXT_PUBLIC_USE_MOCK_API 분기
   ↓            ↓
*.mock.service   *.api.service  → lib/api-client.ts
   ↓                    ↓
region-store      NEXT_PUBLIC_API_BASE_URL 설정 시
(mocks)           https://api-workspace.bomi.ai.kr/api/v1/...
                  미설정 시 /api/* → app/api/[[...path]] → FastAPI 프록시
```

| 파일 접미사 | 용도 |
|-------------|------|
| `*.types.ts` | 요청/응답 TypeScript 타입 |
| `*.mock.service.ts` | 브라우저 목업 (`loadRegionStore`) |
| `*.api.service.ts` | REST `fetch` → FastAPI `/api/v1/*` |
| `*.service.ts` | UI 공개 facade |

## 환경

| 변수 | mock | FastAPI |
|------|------|---------|
| `NEXT_PUBLIC_USE_MOCK_API` | `true` | `false` |
| `NEXT_PUBLIC_API_BASE_URL` | (비움) | `http://127.0.0.1:8020` 또는 프로덕션 URL |

## 도메인 (전부 FastAPI 연동됨)

| Facade | Mock | API |
|--------|------|-----|
| `auth.service` | ✅ | ✅ |
| `dashboard.service` | ✅ | ✅ |
| `organization.service` | ✅ | ✅ |
| `kanban.board.service` | ✅ | ✅ |
| `kanban.task-detail.service` | ✅ | ✅ |
| `kanban.performance.service` | ✅ | ✅ |
| `kanban.documents.service` | ✅ | ✅ |
| `kanban.version-history.service` | ✅ | ✅ |
| `survey.service` | ✅ | ✅ |
| `files.service` | ✅ | ✅ |
| `ebooks.service` | ✅ | ✅ |
| `chat.service` | ✅ (클라이언트 규칙 엔진) | ✅ (RAG + Gemini + 규칙 폴백) |

`chat.server.service.ts`는 레거시 Route Handler용이며, FastAPI 직연동 시에는 `chat.api.service`를 사용합니다.

## 사용 예

```typescript
import { getProjects } from "@/services/kanban.board.service"
import { askAssistantQuestion } from "@/services/chat.service"
```

인증 헤더: `api-client`가 `Authorization: Bearer` + `X-Region-Id` 를 `getClientSession()`에서 자동 첨부합니다.
