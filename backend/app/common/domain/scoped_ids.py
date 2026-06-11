"""하위 호환 — `app.domain.shared.scoped_ids` 사용 권장."""

from app.common.domain.shared.scoped_ids import scope_id, strip_scope

__all__ = ["scope_id", "strip_scope"]
