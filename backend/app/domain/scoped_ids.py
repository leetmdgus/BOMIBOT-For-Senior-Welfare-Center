<<<<<<< HEAD
"""region_id + raw id → DB primary key."""


def scope_id(region_id: str, raw_id: str) -> str:
    if ":" in raw_id:
        return raw_id
    return f"{region_id}:{raw_id}"


def strip_scope(value: str) -> str:
    if ":" in value:
        return value.split(":", 1)[1]
    return value
=======
"""하위 호환 — `app.domain.shared.scoped_ids` 사용 권장."""

from app.domain.shared.scoped_ids import scope_id, strip_scope

__all__ = ["scope_id", "strip_scope"]
>>>>>>> dev2
