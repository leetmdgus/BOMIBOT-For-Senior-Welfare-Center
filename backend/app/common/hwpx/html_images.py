"""리치텍스트 HTML — 텍스트·인라인 이미지 순서 보존 파싱."""

from __future__ import annotations

import base64
import binascii
import re
import struct
from dataclasses import dataclass
from typing import Literal
from urllib.parse import unquote

from lxml import html as lhtml

from app.common.hwpx.encoding import sanitize_hwpx_text, strip_html

_DATA_URL_RE = re.compile(
    r"^data:(image/(?:png|jpeg|jpg|gif|webp));base64,(.+)$",
    re.IGNORECASE | re.DOTALL,
)


@dataclass(frozen=True)
class HtmlTextSegment:
    kind: Literal["text"] = "text"
    text: str = ""


@dataclass(frozen=True)
class HtmlImageSegment:
    kind: Literal["image"] = "image"
    data: bytes = b""
    ext: str = "png"
    alt: str = "이미지"
    width_px: int = 0
    height_px: int = 0


HtmlSegment = HtmlTextSegment | HtmlImageSegment


def parse_image_data_url(src: str) -> tuple[bytes, str] | None:
    raw = (src or "").strip()
    if not raw:
        return None
    match = _DATA_URL_RE.match(raw)
    if not match:
        return None
    mime = match.group(1).lower()
    payload = unquote(match.group(2).strip())
    try:
        data = base64.b64decode(payload, validate=False)
    except (ValueError, binascii.Error):
        return None
    if not data:
        return None
    ext = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/gif": "gif",
        "image/webp": "webp",
    }.get(mime, "png")
    return data, ext


def image_pixel_size(data: bytes) -> tuple[int, int]:
    if len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
        width, height = struct.unpack(">II", data[16:24])
        if width > 0 and height > 0:
            return int(width), int(height)
    if len(data) >= 4 and data[:3] == b"\xff\xd8\xff":
        offset = 2
        while offset + 9 < len(data):
            if data[offset] != 0xFF:
                break
            marker = data[offset + 1]
            offset += 2
            if marker in (0xD8, 0xD9):
                continue
            if offset + 2 > len(data):
                break
            seg_len = struct.unpack(">H", data[offset : offset + 2])[0]
            if seg_len < 2:
                break
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                if offset + 7 <= len(data):
                    height, width = struct.unpack(">HH", data[offset + 3 : offset + 7])
                    if width > 0 and height > 0:
                        return int(width), int(height)
                break
            offset += seg_len
    if len(data) >= 10 and data[:6] in (b"GIF87a", b"GIF89a"):
        width, height = struct.unpack("<HH", data[6:10])
        if width > 0 and height > 0:
            return int(width), int(height)
    return 800, 600


def html_to_ordered_segments(html: str) -> list[HtmlSegment]:
    """HTML 본문 — 문서 순서대로 텍스트·이미지 세그먼트."""
    if not (html or "").strip():
        return []

    segments: list[HtmlSegment] = []

    def push_text(text: str) -> None:
        cleaned = sanitize_hwpx_text(text).strip()
        if cleaned:
            segments.append(HtmlTextSegment(text=cleaned))

    def walk_element(el) -> None:
        if el.text and str(el.text).strip():
            push_text(str(el.text))
        for node in el:
            if not hasattr(node, "tag"):
                text = str(node).strip() if node is not None else ""
                if text:
                    push_text(text)
                continue

            tag = (node.tag or "").lower()
            if tag == "img":
                src = node.get("src") or ""
                parsed = parse_image_data_url(src)
                if parsed:
                    data, ext = parsed
                    width_px, height_px = image_pixel_size(data)
                    alt = sanitize_hwpx_text(node.get("alt") or "이미지") or "이미지"
                    segments.append(
                        HtmlImageSegment(
                            data=data,
                            ext=ext,
                            alt=alt,
                            width_px=width_px,
                            height_px=height_px,
                        )
                    )
                continue
            if tag == "table":
                table_text = sanitize_hwpx_text(node.text_content() or "").strip()
                if table_text:
                    push_text(table_text)
                continue
            if tag == "br":
                continue
            if tag in ("p", "li", "div", "ul", "ol", "h1", "h2", "h3", "h4"):
                walk_element(node)
                continue
            walk_element(node)

    def walk(parent) -> None:
        for node in parent:
            if not hasattr(node, "tag"):
                text = str(node).strip() if node is not None else ""
                if text:
                    push_text(text)
                continue

            tag = (node.tag or "").lower()
            if tag == "img":
                src = node.get("src") or ""
                parsed = parse_image_data_url(src)
                if parsed:
                    data, ext = parsed
                    width_px, height_px = image_pixel_size(data)
                    alt = sanitize_hwpx_text(node.get("alt") or "이미지") or "이미지"
                    segments.append(
                        HtmlImageSegment(
                            data=data,
                            ext=ext,
                            alt=alt,
                            width_px=width_px,
                            height_px=height_px,
                        )
                    )
                continue
            if tag == "table":
                table_text = sanitize_hwpx_text(node.text_content() or "").strip()
                if table_text:
                    push_text(table_text)
                continue
            if tag == "br":
                continue
            if tag in ("p", "li", "div", "ul", "ol", "h1", "h2", "h3", "h4"):
                walk_element(node)
                continue
            walk_element(node)

    try:
        root = lhtml.fragment_fromstring(html, create_parent="div")
    except lhtml.ParserError:
        plain = strip_html(html)
        return [HtmlTextSegment(text=plain)] if plain.strip() else []

    walk(root)

    if not segments:
        plain = strip_html(html)
        if plain.strip():
            return [HtmlTextSegment(text=plain)]
    return segments


def segments_to_cell_text(segments: list[HtmlSegment]) -> str:
    parts = [segment.text for segment in segments if isinstance(segment, HtmlTextSegment)]
    return "\n".join(parts) if parts else ""
