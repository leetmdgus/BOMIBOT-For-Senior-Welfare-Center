# FastAPI 라우트 맵 (`/api/v1`)

로컬: http://127.0.0.1:8020/docs · 프로덕션: https://api-workspace.bomi.ai.kr/docs

목록 갱신:

```bash
cd backend
python scripts/list-routes.py
```

## Auth

| Method | Path |
|--------|------|
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/signup` |
| GET | `/api/v1/auth/session` |
| POST | `/api/v1/auth/logout` |

## 실시간 협업 (WebSocket)

| Protocol | Path | Query |
|----------|------|-------|
| WS | `/api/v1/ws` | `token`, `room`, `userName` |

방 이름 예: `region:chuncheon-north:kanban:2026`, `region:chuncheon-north:task:{taskId}:business-plan`, `region:chuncheon-north:task:{taskId}:evaluation`

이벤트: `presence.join` / `document.draft` / `document.saved` / `kanban.refresh`

## Core

| Method | Path |
|--------|------|
| GET | `/api/v1/dashboard` |
| GET | `/api/v1/employees` |
| GET | `/api/v1/tasks` (legacy) |

## Kanban

| Method | Path |
|--------|------|
| GET/POST | `/api/v1/kanban/boards` |
| PATCH/DELETE | `/api/v1/kanban/boards/{project_id}` … |
| * | `/api/v1/kanban/staff`, `column-types`, `task-path-map`, `project-image-options` |
| * | `/api/v1/kanban/categories/column-type` |
| * | `/api/v1/kanban/task-detail/*` |
| * | `/api/v1/kanban/version-history/*` |

## Region stores

| Domain | Prefix |
|--------|--------|
| Files | `GET/PUT /api/v1/files/manager`, `POST /api/v1/files/upload`, `GET /api/v1/files/{id}/content`, `POST /api/v1/files/{id}/copy` |
| Ebooks | `/api/v1/ebooks` |
| Files | `/api/v1/files`, `/api/v1/files/manager` |
| Surveys | `/api/v1/surveys` |
| Performance | `/api/v1/performance` |
| Reports | `/api/v1/reports` |
| Chat | `/api/v1/chat/*` |

프론트 `*.api.service.ts`는 `NEXT_PUBLIC_API_BASE_URL` 설정 시 위 경로로 **직접** 호출합니다.  
레거시 `/api/*` 는 `app/api/[[...path]]` 가 동일하게 프록시합니다.
