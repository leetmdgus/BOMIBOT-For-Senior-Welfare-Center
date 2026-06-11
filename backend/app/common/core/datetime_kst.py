"""한국 표준시(KST, UTC+9) 유틸."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))


def now_kst() -> datetime:
    return datetime.now(KST)


def format_kst_datetime(
    dt: datetime | None = None,
    fmt: str = "%Y-%m-%d %H:%M",
) -> str:
    """버전 기록 등 UI용 한국 시각 문자열."""
    return (dt or now_kst()).strftime(fmt)


def kst_year(dt: datetime | None = None) -> str:
    return str((dt or now_kst()).year)


def to_kst(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=KST)
    return dt.astimezone(KST)
