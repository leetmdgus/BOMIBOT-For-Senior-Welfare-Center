FROM python:3.12-slim AS runtime

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
COPY seed ./seed
COPY scripts ./scripts
COPY HWPX_TEMPLATES ./HWPX_TEMPLATES

# COPY app 캐시로 render 템플릿 누락 방지 — 빌드 컨텍스트에 파일 필수
COPY app/application/hwpx/templates/render/plan.hwpx \
    app/application/hwpx/templates/render/evaluation.hwpx \
    /app/app/application/hwpx/templates/render/

RUN test -s /app/app/application/hwpx/templates/render/plan.hwpx \
    && test -s /app/app/application/hwpx/templates/render/evaluation.hwpx \
    || (echo "ERROR: HWPX render templates missing. Run: backend/scripts/sync_hwpx_render_templates.sh" >&2 && exit 1)

# rhwp HWP/HWPX → SVG 렌더러 (리눅스 amd64). .hwp 미리보기에 필수.
# 사전 빌드 산출물: backend/scripts/build-rhwp-linux.ps1 (또는 .sh) → backend/bin/rhwp
# 기본 native 폰트 모드는 임베디드 메트릭만 사용하므로 ttfs 폰트 파일 불필요.
COPY bin/rhwp /usr/local/bin/rhwp
RUN chmod +x /usr/local/bin/rhwp && test -x /usr/local/bin/rhwp

# Windows CRLF/BOM in .sh breaks ENTRYPOINT (no such file / exec format error)
RUN sed -i 's/\r$//' /app/scripts/*.sh \
    && sed -i '1s/^\xEF\xBB\xBF//' /app/scripts/*.sh \
    && chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 9001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:9001/health || exit 1

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9001", "--proxy-headers", "--forwarded-allow-ips", "*"]
