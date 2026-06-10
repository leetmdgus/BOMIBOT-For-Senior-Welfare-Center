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

# rhwp HWP/HWPX → SVG 렌더러 (리눅스 amd64). .hwp 미리보기용(선택).
# 바이너리(backend/bin/rhwp)는 gitignore — 배포 체크아웃엔 없을 수 있으므로
# bin/ 디렉터리째 복사 후 rhwp 가 있을 때만 설치한다. 없어도 빌드는 통과하며
# .hwp 미리보기만 비활성(.hwpx 는 DOM 폴백). 생성: backend/scripts/build-rhwp-linux.sh|.ps1
COPY bin/ /tmp/rhwp-bin/
RUN if [ -f /tmp/rhwp-bin/rhwp ]; then \
        cp /tmp/rhwp-bin/rhwp /usr/local/bin/rhwp \
        && chmod 0755 /usr/local/bin/rhwp \
        && echo "rhwp installed"; \
    else \
        echo "WARN: backend/bin/rhwp 없음 — .hwp 미리보기 비활성 (.hwpx 폴백 동작)"; \
    fi \
    && rm -rf /tmp/rhwp-bin

# Windows CRLF/BOM in .sh breaks ENTRYPOINT (no such file / exec format error)
RUN sed -i 's/\r$//' /app/scripts/*.sh \
    && sed -i '1s/^\xEF\xBB\xBF//' /app/scripts/*.sh \
    && chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 9001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:9001/health || exit 1

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9001", "--proxy-headers", "--forwarded-allow-ips", "*"]
