# Next.js `/api` (레거시 호환)

프로덕션·로컬 FastAPI 연동 시 브라우저는 **`NEXT_PUBLIC_API_BASE_URL`** 로 직접 호출합니다 (`lib/api-client.ts`).

이 폴더는 다음 경우에만 사용됩니다.

| 설정 | 동작 |
|------|------|
| `NEXT_PUBLIC_USE_MOCK_API=true` | `*.mock.service` (대부분 `/api` 미사용) |
| `NEXT_PUBLIC_API_BASE_URL` 설정 + 상대 `/api/*` 호출 | `[[...path]]/route.ts` → FastAPI `/api/v1/*` 프록시 |
| 둘 다 없음 + `USE_MOCK_API=false` | 503 (설정 필요) |

개별 Route Handler 40+개는 제거되었습니다. 명세는 FastAPI Swagger `/docs` 및 `docs/API_SPEC.md`를 참고하세요.
