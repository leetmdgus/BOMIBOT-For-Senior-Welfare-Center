# FastAPI 라우트 맵 (`/api/v1`)

> **최종 갱신:** 2026-06-08

로컬: http://127.0.0.1:9001/docs · 프로덕션: https://api-workspace.bomi.ai.kr/docs

목록 갱신:

```bash
cd backend
python scripts/list-routes.py
```

## Auth

| Method | Path                   |
| --------| ------------------------|
| POST   | `/api/v1/auth/login`   |
| POST   | `/api/v1/auth/signup`  |
| GET    | `/api/v1/auth/session` |
| POST   | `/api/v1/auth/logout`  |

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
| Files | `GET/PUT /api/v1/files/manager`, `POST /api/v1/files/upload`, `GET /api/v1/files/{id}/content`, `POST /api/v1/files/{id}/copy`, `GET /api/v1/files/{id}/render-svg` |
| Ebooks | `/api/v1/ebooks` |
| Files | `/api/v1/files`, `/api/v1/files/manager` |
| Surveys | `/api/v1/surveys` |
| Performance | `/api/v1/performance` |
| Reports | `/api/v1/reports` |
| Chat | `/api/v1/chat/*` |

## Automation (문서자동화)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/automation/hwpx/parse` | HWPX 업로드 → `frontendJson` (편집 가능 문단/표 구조) |
| POST | `/api/v1/automation/hwpx/export` | 원본 HWPX + `frontendJson` → HWPX 다운로드 (원본 보존, section0만 교체) |
| POST | `/api/v1/automation/hwpx/render-svg` | HWPX(+ 편집 `frontendJson`) → **rhwp 페이지 SVG** 미리보기. rhwp 바이너리 없으면 503 → 프론트가 근사 렌더러로 폴백 |
| POST | `/api/v1/automation/hwpx/ai-fill` | 양식 빈칸 + 참고문서 → Gemini로 자동 채움(`{fills}`). `GEMINI_API_KEY` 없으면 503 |
| POST | `/api/v1/automation/documents/analyze` | 증빙·문서 파일 분석 (hwpx/docx/pdf/xlsx/이미지 평문 추출) |
| GET | `/api/v1/automation/documents/supported-extensions` | 지원 확장자 목록 |

## Document templates (양식 자동작성)

업로드 양식(`.hwpx`)을 region별 라이브러리에 보관 → "이전 양식 불러오기" + 계획/평가 값 채움.

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/document-templates` | 양식 목록 (이전 양식 불러오기) |
| POST | `/api/v1/document-templates` | 양식 업로드 (multipart: `file`, `name?`, `kind?`) → 저장 |
| GET | `/api/v1/document-templates/{id}` | `frontendJson` (편집 구조) |
| DELETE | `/api/v1/document-templates/{id}` | 양식 삭제 |
| POST | `/api/v1/document-templates/{id}/prefill` | 계획/평가 값을 라벨 매칭으로 채운 `frontendJson` 반환 |
| POST | `/api/v1/document-templates/{id}/export` | 채운 `frontendJson` → HWPX 다운로드 (`export_hwpx_preserving`) |

> 기획·진행 현황: [HWP_IMPORT_AI_EXTRACT_PLAN.md](./HWP_IMPORT_AI_EXTRACT_PLAN.md). 미리보기 렌더(rhwp) 배포 주의는 [DEPLOYMENT.md](./DEPLOYMENT.md) 참고.

프론트: `https://workspace.bomi.ai.kr/automation` · multipart/form-data · `Authorization` + `X-Region-Id` 필요

프론트 `*.api.service.ts`는 `NEXT_PUBLIC_API_BASE_URL` 설정 시 위 경로로 **직접** 호출합니다.  
레거시 `/api/*` 는 `app/api/[[...path]]` 가 동일하게 프록시합니다.
