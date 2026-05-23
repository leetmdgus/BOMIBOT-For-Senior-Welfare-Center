# BOMIBOT-FRONTEND

봄이봇 **Next.js** 프론트엔드입니다. 개발 서버는 **`frontend-next` 폴더에서만** 실행하세요.

## 실행 (Next.js)

```powershell
cd frontend-next
npm install
npm run dev
```

- 기본 `dev`는 **Webpack** 모드 + Node 힙 **8GB** (`--max-old-space-size=8192`)  
- Turbopack이 OOM 나면 Webpack을 쓰세요. Turbopack이 필요하면: `npm run dev:turbo`

브라우저: **http://localhost:3000** (Next 기본 포트)

메모리 부족이 계속되면:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run dev
```

그리고 `C:\Users\hyun\package-lock.json` 같은 **상위 홈 lockfile** 이 있으면 Next workspace 를 잘못 잡을 수 있습니다. 가능하면 제거하거나, 반드시 `frontend-next` 에서만 실행하세요.

## 주의 — Vite 프로젝트와 분리

저장소 안의 `Bomi-Slot-document-automatation/` 은 **별도 Vite 앱**입니다.

| 구분 | 경로 | dev 명령 |
|------|------|----------|
| **봄이봇 (이 프로젝트)** | `frontend-next/` | `npm run dev` → Next |
| 문서 자동화 (참고용) | `Bomi-Slot-document-automatation/Bomi-Slot-document-automatation-frontend/` | `npm run dev` → Vite |

`Bomi-Slot-document-automatation-frontend` 에서 `npm run dev` 를 켠 뒤 같은 포트로 접속하면 브라우저가 `/@vite/client`, `/@react-refresh` 를 요청합니다. **Next 오류가 아니라 Vite 서버에 접속한 것**입니다.

## Next 진입점 (App Router)

- `frontend-next/app/layout.tsx`
- `frontend-next/app/page.tsx`
- `frontend-next/app/kanban/page.tsx`
- `frontend-next/app/kanban/task/[id]/business-plan/page.tsx` 등

`index.html`, `src/main.tsx`, `vite.config.*` 는 **frontend-next에 없음** — 있으면 제거 대상입니다.

## lockfile 경고

상위 폴더(`C:\Users\hyun\package-lock.json` 등)에 다른 lockfile 이 있으면 Next가 workspace root 를 잘못 잡을 수 있습니다. `frontend-next/next.config.mjs` 에 `turbopack.root` 가 설정되어 있습니다.
