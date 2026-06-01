#!/usr/bin/env python3
"""FastAPI 라우트 목록 (OpenAPI paths)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402


def main() -> None:
    paths = sorted(
        {
            getattr(route, "path", None)
            for route in app.routes
            if getattr(route, "path", None)
        }
    )
    for path in paths:
        if path.startswith("/api/v1") or path in ("/health", "/"):
            print(path)


if __name__ == "__main__":
    main()
