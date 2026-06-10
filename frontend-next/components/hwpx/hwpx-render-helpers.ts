// hwpx-render-helpers.ts — HWPX render-JSON을 한글에 가깝게 그릴 때 쓰는 공용 단위/스타일/경계 헬퍼.
// 읽기전용 렌더러(HwpxRenderer)와 직접수정 편집기(HwpxWysiwygEditor)가 함께 사용한다.

import type React from "react"

export type AnyObj = Record<string, any>

export type Margins = { top: number; right: number; bottom: number; left: number }
export type RenderCtx = { borderFills: AnyObj }

// ── 단위 ────────────────────────────────────────────────
// HWPUNIT = 1/7200 inch. 96dpi → px = hwpunit / 75, mm = hwpunit / 7200 * 25.4
export const MM_TO_PX = 96 / 25.4
export const PAGE_W_MM = 210
export const PAGE_H_MM = 297
export const DEFAULT_MARGIN_MM = 20
export const HANGUL_FALLBACK =
  '"함초롬바탕", "Batang", "Malgun Gothic", "맑은 고딕", serif'

export function toNum(v: unknown): number | undefined {
  if (typeof v === "number") return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    return Number.isNaN(n) ? undefined : n
  }
  return undefined
}

export function hwpunitToPx(v?: number | null): number | undefined {
  if (v == null) return undefined
  return v / 75
}

export function hwpunitToMm(v?: number | null): number {
  if (v == null) return DEFAULT_MARGIN_MM
  return (v / 7200) * 25.4
}

export function getMargins(data: AnyObj): Margins {
  const pageDef = (data.maps?.page_defs ?? [])[0] as AnyObj | undefined
  const m = pageDef?.margin as AnyObj | undefined
  if (!m) {
    return {
      top: DEFAULT_MARGIN_MM,
      right: DEFAULT_MARGIN_MM,
      bottom: DEFAULT_MARGIN_MM,
      left: DEFAULT_MARGIN_MM,
    }
  }
  // 본문 영역 = 페이지 여백 + 머리말/꼬리말 높이
  const top = hwpunitToMm(toNum(m.top)) + hwpunitToMm(toNum(m.header))
  const bottom = hwpunitToMm(toNum(m.bottom)) + hwpunitToMm(toNum(m.footer))
  return {
    top: top || DEFAULT_MARGIN_MM,
    right: hwpunitToMm(toNum(m.right)) || DEFAULT_MARGIN_MM,
    bottom: bottom || DEFAULT_MARGIN_MM,
    left: hwpunitToMm(toNum(m.left)) || DEFAULT_MARGIN_MM,
  }
}

export function localTag(tag: unknown): string {
  if (typeof tag !== "string") return ""
  return tag.split("}").pop()!.split(":").pop() ?? ""
}

const BORDER_STYLE_MAP: Record<string, string> = {
  SOLID: "solid",
  THICK: "solid",
  DASH: "dashed",
  DOT: "dotted",
  DASH_DOT: "dashed",
  DASH_DOT_DOT: "dashed",
  LONG_DASH: "dashed",
  CIRCLE: "dotted",
  DOUBLE_SLIM: "double",
  SLIM_THICK: "double",
  THICK_SLIM: "double",
}

/** borderFill의 한 변(leftBorder 등) attrs → CSS border 문자열. NONE이면 none. */
function borderSideCss(side: AnyObj | undefined): string {
  const a = (side?.attrs ?? {}) as AnyObj
  const type = String(a.type ?? "NONE").toUpperCase()
  if (type === "NONE" || type === "") return "none"
  const css = BORDER_STYLE_MAP[type] ?? "solid"
  const width = String(a.width ?? "0.12 mm").replace(/\s+/g, "") || "0.12mm"
  const color = a.color && String(a.color).toLowerCase() !== "none" ? a.color : "#000000"
  return `${width} ${css} ${color}`
}

/** 셀 borderFillIDRef → 4변 CSS border. borderFill이 없으면 가는 실선 폴백. */
export function resolveCellBorders(
  borderFillId: string | undefined,
  borderFills: AnyObj,
): React.CSSProperties {
  const bf = borderFillId != null ? (borderFills?.[String(borderFillId)] as AnyObj) : undefined
  const raw = bf?.raw_node as AnyObj | undefined
  const children = (raw?.children as AnyObj[] | undefined) ?? null
  if (!children) {
    return { border: "1px solid #000" } // 정보 없음 → 표처럼 보이도록 폴백
  }
  const sides: Record<string, AnyObj> = {}
  for (const child of children) {
    const t = localTag(child?.tag)
    if (t === "leftBorder" || t === "rightBorder" || t === "topBorder" || t === "bottomBorder") {
      sides[t] = child
    }
  }
  return {
    borderTop: borderSideCss(sides.topBorder),
    borderRight: borderSideCss(sides.rightBorder),
    borderBottom: borderSideCss(sides.bottomBorder),
    borderLeft: borderSideCss(sides.leftBorder),
  }
}

export function mapTextAlign(value?: string): React.CSSProperties["textAlign"] {
  switch (value) {
    case "CENTER": return "center"
    case "RIGHT": return "right"
    case "JUSTIFY": case "DISTRIBUTE": return "justify"
    default: return "left"
  }
}

export function mapVerticalAlign(value?: string): React.CSSProperties["verticalAlign"] {
  switch (value) {
    case "TOP": return "top"
    case "BOTTOM": return "bottom"
    case "CENTER": return "middle"
    default: return "middle"
  }
}

export function getParagraphStyle(p: AnyObj): React.CSSProperties {
  const ps = p.paragraph_style ?? {}
  const align = ps.align?.horizontal
  const ls = ps.lineSpacing as AnyObj | undefined
  let lineHeight: number | undefined
  if (ls) {
    const type = String(ls.type ?? "").toUpperCase()
    const val = toNum(ls.value)
    // PERCENT(예: 160) → 1.6. FIXED/AT_LEAST(HWPUNIT)는 글꼴 의존이라 기본값 사용.
    if ((type === "PERCENT" || type === "") && val && val > 0) {
      lineHeight = val / 100
    }
  }
  return { textAlign: mapTextAlign(align), lineHeight }
}

export function getTextRunStyle(run: AnyObj): React.CSSProperties {
  const s = run.style ?? {}
  const heightPt =
    typeof s.height === "number"
      ? s.height / 100
      : typeof s.size_px_guess === "number"
        ? s.size_px_guess
        : undefined
  return {
    fontFamily: s.font ? `"${s.font}", ${HANGUL_FALLBACK}` : HANGUL_FALLBACK,
    fontSize: heightPt ? `${heightPt}pt` : undefined,
    color: s.textColor && s.textColor !== "none" ? s.textColor : undefined,
    fontWeight: s.bold ? 700 : 400,
    fontStyle: s.italic ? "italic" : "normal",
    textDecoration:
      s.underline?.type && s.underline.type !== "NONE"
        ? "underline"
        : s.strikeout?.shape && s.strikeout.shape !== "NONE"
          ? "line-through"
          : "none",
    whiteSpace: "pre-wrap",
  }
}

/**
 * 본문 블록(최상위 문단)을 측정해 A4 본문 높이 단위로 분할.
 * 한 블록이 페이지보다 크면 그 블록만 단독 페이지에 둔다(넘침 허용).
 */
export function paginate(heights: number[], contentHeightPx: number): number[][] {
  const pages: number[][] = []
  let current: number[] = []
  let used = 0
  heights.forEach((h, i) => {
    if (current.length > 0 && used + h > contentHeightPx) {
      pages.push(current)
      current = []
      used = 0
    }
    current.push(i)
    used += h
  })
  if (current.length > 0) pages.push(current)
  return pages.length > 0 ? pages : [[]]
}
