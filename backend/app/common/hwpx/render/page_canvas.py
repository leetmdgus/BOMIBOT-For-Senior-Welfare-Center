"""A4 근사 페이지 HTML — render_json 미리보기 래퍼."""

from __future__ import annotations

from app.common.hwpx.ast.types import DEFAULT_HWP_PAGE
from app.common.hwpx.render.preview_theme import HWPX_PREVIEW_THEME_CSS

PAGE_CSS = HWPX_PREVIEW_THEME_CSS


def wrap_page_canvas_html(
    body_html: str,
    *,
    title: str = "HWPX Preview",
    document_title: str | None = None,
    header_label: str = "머리말 영역",
    footer_label: str = "꼬리말 영역",
    page: dict | None = None,
) -> str:
    """한글 동일 조판이 아닌 A4 근사 렌더링 (에디터·양식과 시각 정렬)."""
    del header_label, footer_label
    layout = page or DEFAULT_HWP_PAGE
    wrapped_body = (
        body_html
        if "hwpx-doc" in body_html
        else f'<div class="hwpx-doc hwpx-doc--preview">{body_html}</div>'
    )
    title_block = ""
    if document_title:
        safe_title = (
            document_title.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )
        title_block = f'<h2 class="hwpx-doc__title">{safe_title}</h2>'
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>{title}</title>
  <style>{PAGE_CSS}
  .hwpx-page {{
    width: {layout["width"]}px;
    min-height: {layout["height"]}px;
    padding: {layout["marginTop"]}px {layout["marginRight"]}px
             {layout["marginBottom"]}px {layout["marginLeft"]}px;
  }}
  </style>
</head>
<body>
  <div class="hwpx-page-root">
    <div class="hwpx-page">
      <div class="hwpx-page-header"></div>
      <div class="hwpx-page-body">{title_block}{wrapped_body}</div>
      <div class="hwpx-page-footer"></div>
    </div>
  </div>
</body>
</html>"""
