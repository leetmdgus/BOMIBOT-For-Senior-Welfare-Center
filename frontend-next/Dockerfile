# syntax=docker/dockerfile:1
# Next.js 16 (standalone) 프로덕션 이미지 — pnpm
# 빌드 컨텍스트: frontend-next/  (루트 docker-compose.yml 이 자동 지정)
# pnpm-lock.yaml 이 package.json 과 동기화된 lockfile (package-lock.json 은 stale)

# ── 1) deps: 의존성만 설치 (레이어 캐시 극대화) ──
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── 2) builder: next build → .next/standalone ──
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* 는 빌드 타임에 번들에 구워짐 → 빌드 ARG 로 주입.
# 프록시 모드 기본값: 브라우저는 same-origin /api/* 만 호출(CORS 불필요),
# 서버사이드 라우트 핸들러가 런타임 API_PROXY_URL 로 FastAPI 에 프록시.
ARG NEXT_PUBLIC_USE_API_PROXY=true
ARG NEXT_PUBLIC_USE_MOCK_API=false
ARG NEXT_PUBLIC_COLLABORATION_ENABLED=false
ARG NEXT_PUBLIC_API_BASE_URL=
ARG NEXT_PUBLIC_API_PROXY_URL=
ARG NEXT_PUBLIC_WS_BASE_URL=
# 빌드 OOM 시 상향 (예: --build-arg NODE_OPTIONS=--max-old-space-size=8192)
ARG NODE_OPTIONS=--max-old-space-size=4096
ENV NEXT_PUBLIC_USE_API_PROXY=$NEXT_PUBLIC_USE_API_PROXY \
    NEXT_PUBLIC_USE_MOCK_API=$NEXT_PUBLIC_USE_MOCK_API \
    NEXT_PUBLIC_COLLABORATION_ENABLED=$NEXT_PUBLIC_COLLABORATION_ENABLED \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_API_PROXY_URL=$NEXT_PUBLIC_API_PROXY_URL \
    NEXT_PUBLIC_WS_BASE_URL=$NEXT_PUBLIC_WS_BASE_URL \
    NODE_OPTIONS=$NODE_OPTIONS \
    NEXT_STANDALONE=true \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN pnpm build

# ── 3) runner: 최소 런타임 ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=9000 \
    HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# 정적 자산 + standalone 서버 (server.js, 최소 node_modules 포함)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 9000

# alpine 기본 이미지엔 curl 이 없어 node fetch 로 헬스체크 (서버 응답 < 500 이면 정상)
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:9000/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
