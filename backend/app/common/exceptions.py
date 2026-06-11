"""공통 예외 처리.

모든 도메인 모듈에서 동일한 에러 응답 형태(`{"error": ...}`)를 사용하도록
FastAPI 예외 핸들러를 한 곳에서 등록한다. `app.main` 이 앱 생성 직후 호출한다.
성공 응답 본문은 감싸지 않는다(프론트엔드 계약 보존).
"""

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("bomibot.api")


def register_exception_handlers(app: FastAPI) -> None:
    """앱 전역 예외 핸들러 등록(에러 응답 형태 통일)."""

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
