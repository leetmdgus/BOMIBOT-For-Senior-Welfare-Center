"""region_id + raw id → DB primary key."""


def scope_id(region_id: str, raw_id: str) -> str:
    if ":" in raw_id:
        return raw_id
    return f"{region_id}:{raw_id}"


def strip_scope(value: str) -> str:
    if ":" in value:
        return value.split(":", 1)[1]
    return value
