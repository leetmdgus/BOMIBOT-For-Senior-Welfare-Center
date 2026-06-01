"""HWPX(OWPML) 텍스트·XML 인코딩 — 한글 깨짐 방지."""

from __future__ import annotations

import html as html_lib
import re
import unicodedata

_INVALID_XML_CHAR = re.compile(
    r"[\x00-\x08\x0b\x0c\x0e-\x1f\ufdd0-\ufdef\ufffe\uffff]"
    r"|[\ud800-\udfff]"
)
_SLOT_PLACEHOLDER = "• 한 줄씩 입력하면 목록으로 표시됩니다"


def sanitize_hwpx_text(value: str | None) -> str:
    text = unicodedata.normalize("NFC", str(value or ""))
    text = _INVALID_XML_CHAR.sub("", text)
    return text.replace("\r\n", "\n").replace("\r", "\n")


def prv_safe_value(value: str | None) -> str:
    """Preview/PrvText.txt — <> 구분자가 본문에 있으면 한글 변조 검사 실패 가능."""
    return sanitize_hwpx_text(value).replace("<", " ").replace(">", " ")


def escape_xml(value: str) -> str:
    return (
        sanitize_hwpx_text(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def decode_html_entities(value: str) -> str:
    if not value:
        return ""
    return html_lib.unescape(value)


def strip_html(html: str) -> str:
    if not html:
        return ""
    decoded = decode_html_entities(html)
    text = re.sub(r"<br\s*/?>", "\n", decoded, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</li>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return sanitize_hwpx_text(text.strip())


def parse_line_slots(value: str) -> list[str]:
    trimmed = value.strip()
    if not trimmed or trimmed == _SLOT_PLACEHOLDER:
        return []
    return [line.strip() for line in trimmed.split("\n") if line.strip()]


def line_slot_display_value(value: str) -> str:
    lines = parse_line_slots(value)
    return "\n".join(lines) if lines else ""


def format_line_slot_text(value: str) -> str:
    lines = [line.strip() for line in value.split("\n") if line.strip()]
    if not lines:
        return ""
    if len(lines) == 1:
        return lines[0]
    return "\n".join(f"• {line}" for line in lines)


def slot_lines(value: str) -> str:
    lines = parse_line_slots(value)
    raw = "\n".join(lines) if lines else line_slot_display_value(value)
    return format_line_slot_text(raw)


def hp_text_run(char_id: str, text: str) -> str:
    normalized = sanitize_hwpx_text(text)
    payload = normalized if normalized else " "
    escaped = escape_xml(payload)
    needs_preserve = (
        payload != payload.strip()
        or payload.startswith((" ", "\t"))
        or payload.endswith((" ", "\t"))
    )
    space_attr = ' xml:space="preserve"' if needs_preserve else ""
    return (
        f'<hp:run charPrIDRef="{char_id}">'
        f"<hp:t{space_attr}>{escaped}</hp:t></hp:run>"
    )


def hp_text_runs(char_id: str, text: str) -> str:
    safe = sanitize_hwpx_text(text)
    lines = safe.split("\n")
    if not lines or (len(lines) == 1 and not lines[0]):
        return hp_text_run(char_id, " ")
    parts: list[str] = []
    for index, line in enumerate(lines):
        parts.append(hp_text_run(char_id, line or " "))
        if index < len(lines) - 1:
            parts.append(
                f'<hp:run charPrIDRef="{char_id}"><hp:lineBreak/></hp:run>'
            )
    return "".join(parts)
