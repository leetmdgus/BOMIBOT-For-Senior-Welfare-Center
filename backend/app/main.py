import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import get_settings
from app.core.cors import cors_middleware_kwargs, resolve_cors_origin_regex, resolve_cors_origins
from sqlalchemy import text

from app.core.database import Base, SessionLocal, engine
from app.infrastructure.persistence import models  # noqa: F401
from app.infrastructure.seed import seed_all, seed_missing_json_stores
from app.interfaces.api.v1.router import api_router

logger = logging.getLogger("bomibot.api")
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    cors_origins = resolve_cors_origins(settings)

=======    cors_regex = resolve_cors_origin_regex(settings)
    logger.info(
        "Starting %s [%s] cors_origins=%s cors_regex=%s",
        settings.app_name,
        settings.app_env,
        cors_origins,
        cors_regex or "(none)",
    )

    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    if settings.run_seed_on_startup or settings.seed_missing_json_on_startup:
        session = SessionLocal()
        try:
            if settings.run_seed_on_startup:
                seed_all(session)
            if settings.seed_missing_json_on_startup:
                seed_missing_json_stores(session)
        finally:
            session.close()
    yield


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs" if settings.is_development else "/docs",
    redoc_url="/redoc" if settings.is_development else "/redoc",
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    detail = exc.detail
    message = detail if isinstance(detail, str) else str(detail)
    return JSONResponse(status_code=exc.status_code, content={"error": message})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": str(exc)},
    )


# Host 헤더 검증 (프로덕션만). CORS보다 먼저 등록 → 요청 시 CORS가 먼저 실행됨
if settings.trusted_host_list and settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.trusted_host_list,
    )

# CORS — 마지막 등록 = 가장 바깥 미들웨어 (OPTIONS preflight 우선 처리)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://workspace.bomi.ai.kr",
        "https://localhost:5143",
        "https://localhost:3000",
        "https://localhost:9000",
        "http://10.50.209.5:9000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _read_alembic_revision() -> str | None:
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT version_num FROM alembic_version LIMIT 1")
            ).fetchone()
            return str(row[0]) if row else None
    except Exception:
        return None


@app.get("/health")
def health():
    db_status = "ok"
    migration: str | None = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        migration = _read_alembic_revision()
    except Exception as exc:
        logger.warning("Health DB check failed: %s", exc)
        db_status = "error"

    payload: dict[str, object] = {
        "status": "ok" if db_status == "ok" else "degraded",
        "env": settings.app_env,
        "database": db_status,
        "api": settings.api_v1_prefix,
        "llm": bool((settings.gemini_api_key or "").strip()),
    }
    if migration:
        payload["migration"] = migration
    return payload


@app.get("/")
def root():
    return {
        "service": settings.app_name,
        "docs": "/docs",
        "health": "/health",
        "api": settings.api_v1_prefix,
    }


app.include_router(api_router, prefix=settings.api_v1_prefix)
