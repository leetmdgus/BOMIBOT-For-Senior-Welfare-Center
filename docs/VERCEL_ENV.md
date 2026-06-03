# Vercel 환경 변수 체크리스트

<<<<<<< HEAD
프론트 Root Directory: **`frontend-next`**
=======
프론트 Root Directory: **`frontend-next`**  
Production 도메인: **`https://workspace.bomi.ai.kr`** → API **`https://api-workspace.bomi.ai.kr`**
>>>>>>> dev2

## Production (필수)

**복사용 파일:** [`frontend-next/env.vercel.production.txt`](../frontend-next/env.vercel.production.txt)

| 변수 | 예시 값 | 설명 |
|------|---------|------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api-workspace.bomi.ai.kr` | 끝에 `/` 없음 |
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | FastAPI만 사용 |

Vercel 프로젝트에 `frontend-next/vercel.json`이 빌드 명령을 지정합니다. Root Directory는 대시보드에서 **`frontend-next`** 로 설정하세요.

## Preview (선택)

| 방식 | 설정 |
|------|------|
| API 연동 | Production과 동일 URL |
| UI만 | `NEXT_PUBLIC_USE_MOCK_API=true` (API_BASE 비움) |

## 챗봇 LLM (프론트 불필요)

Gemini/SMTP/RAG는 **백엔드 API 서버** `.env`에 설정합니다.

```env
GEMINI_API_KEY=...
GEMINI_BASE_URL=https://factchat-cloud.mindlogic.ai/v1/gateway
GEMINI_MODEL=gemini-2.0-flash
```

## 프로덕션 API 서버 (최초 1회)

```bash
cd backend
cp .env.docker.example .env   # SECRET_KEY, POSTGRES_PASSWORD, GEMINI 등
./scripts/deploy-prod.sh
./scripts/prod-bootstrap.sh --force --smoke
```

## 배포 후 확인

1. Vercel → Settings → Environment Variables → **Redeploy**
2. 브라우저 로그인 (북부 admin)
3. Network 탭: `api-workspace.bomi.ai.kr/api/v1/...` → 200
4. CORS 오류 시 API 서버 `CORS_ORIGINS`에 Vercel 도메인 추가

## 로컬 개발 (`frontend-next/.env.local`)

```env
<<<<<<< HEAD
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8020
=======
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:9001
>>>>>>> dev2
NEXT_PUBLIC_USE_MOCK_API=false
```

백엔드: `cd backend && docker compose up -d --build`

스모크 테스트: `backend/scripts/smoke-test.ps1`
