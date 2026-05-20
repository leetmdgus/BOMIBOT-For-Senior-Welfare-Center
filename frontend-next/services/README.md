# `services/` — 도메인 API Facade

모든 화면은 **`*.service.ts`** 만 import 합니다.

## 패턴

```
components / app
       ↓
*.service.ts          ← NEXT_PUBLIC_USE_MOCK_API 분기
   ↓            ↓
*.mock.service   *.api.service  → fetch("/api/...")
   ↓                    ↓
lib/mocks/*.ts    app/api/** → *.mock.service | *.server.service
```

| 파일 접미사 | 용도 |
|-------------|------|
| `*.types.ts` | 요청/응답 TypeScript 타입 |
| `*.mock.service.ts` | 브라우저·서버 목업 비즈니스 로직 |
| `*.api.service.ts` | REST `fetch` 클라이언트 |
| `*.service.ts` | UI 공개 facade |
| `*.server.service.ts` | **서버 전용** (Route Handler만 import) |

## 도메인 목록

| Facade | Mock | API | 비고 |
|--------|------|-----|------|
| `dashboard.service` | `dashboard.mock.service` | `dashboard.api.service` | |
| `organization.service` | `organization.mock.service` | `organization.api.service` | |
| `ebooks.service` | `ebooks.mock.service` | `ebooks.api.service` | |
| `files.service` | `files.mock.service` | `files.api.service` | |
| `kanban.board.service` | `kanban.board.mock.service` | `kanban.board.api.service` | |
| `kanban.version-history.service` | `…mock…` | `…api…` | |
| `kanban.task-detail.service` | `…mock…` | `…api…` | |
| `kanban.performance.service` | `…mock…` | `…api…` | |
| `kanban.documents.service` | `…mock…` | `…api…` | |
| `survey.service` | `survey.mock.service` | `survey.api.service` | |
| `chat.service` | `chat.mock.service` | `chat.api.service` | 어시스턴트·CS·온톨로지는 `/api/chat/*` 경유 |
| `chat.server.service` | — | — | Route Handler 전용 |
| `auth.service` | — | — | FastAPI 연동 예정 (스텁) |

## 챗봇 예외

`NEXT_PUBLIC_USE_MOCK_API=true` 여도 다음은 **서버 API 필수** (LLM·SMTP·그래프 빌드):

- `POST /api/chat/assistant`
- `POST /api/chat/cs-ticket`
- `GET /api/chat/ontology`

`getChatConfig()` 만 mock 모드에서 인메모리 설정을 반환합니다.

## 사용 예

```typescript
import { getProjects } from "@/services/kanban.board.service"
import { askAssistantQuestion, submitCsTicket, getOntologyGraph } from "@/services/chat.service"

const graph = await getOntologyGraph("5월 실적")
const answer = await askAssistantQuestion({ message: "5월 예산 합계는?" })
```

명세: [docs/API_SPEC.md](../docs/API_SPEC.md) · 리뷰: [docs/FRONTEND_REVIEW.md](../docs/FRONTEND_REVIEW.md)
