# Vercel 환경 변수 체크리스트

> **최종 갱신:** 2026-06-08

프론트 Root Directory: **`frontend-next`**  
Production 도메인: **`https://workspace.bomi.ai.kr`** → API **`https://api-workspace.bomi.ai.kr`**

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

## 챗봇 LLM · 문서자동화 AI (프론트 불필요)

Gemini/SMTP/RAG/rhwp는 **백엔드 API 서버** `.env`에 설정합니다. `GEMINI_*`는 챗봇 어시스턴트와 문서자동화 **AI 자동 채움**(`/automation/hwpx/ai-fill`)이 공용으로 씁니다.

```env
GEMINI_API_KEY=...
GEMINI_BASE_URL=https://factchat-cloud.mindlogic.ai/v1/gateway
GEMINI_MODEL=gemini-2.5-flash   # ⚠️ 기본값 gemini-2.0-flash는 현재 키에서 403(권한없음). 접근 가능한 모델로 설정

# HWP/HWPX 미리보기 렌더러 (선택) — 비우면 자동 탐색, 미설치 시 근사 렌더러 폴백
# RHWP_BIN=/usr/local/bin/rhwp
```

> rhwp 바이너리는 현재 프로덕션 Docker 이미지에 **포함되지 않습니다**(근사 렌더러 폴백). 상세: [DEPLOYMENT.md](./DEPLOYMENT.md) §5.

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
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:9001
NEXT_PUBLIC_USE_MOCK_API=false
```

백엔드: `cd backend && docker compose up -d --build`

스모크 테스트: `backend/scripts/smoke-test.ps1`
