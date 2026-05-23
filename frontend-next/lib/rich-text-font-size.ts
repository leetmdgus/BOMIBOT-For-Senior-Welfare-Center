/** 한글(한컴) 워드 — 글자 크기(px) */

import { focusActiveRichTextContainer } from "@/lib/rich-text-edit-target"
import { isFullEditorSelection } from "@/lib/rich-text-selection"

export const DEFAULT_EDITOR_FONT_SIZE_PX = 11

/** 한글 문서용 작은 크기 위주 (px) */
export const HANGUL_FONT_SIZES_PX = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28,
] as const

export type HangulFontSizePx = (typeof HANGUL_FONT_SIZES_PX)[number]

export function parseFontSizePx(value: string | undefined): number | null {
  if (!value) return null
  const m = /^([\d.]+)\s*px$/i.exec(value.trim())
  if (!m) return null
  const px = Math.round(Number(m[1]))
  return Number.isFinite(px) && px > 0 ? px : null
}

export function snapToHangulFontSizePx(px: number): HangulFontSizePx {
  let nearest = HANGUL_FONT_SIZES_PX[0]
  let minDiff = Math.abs(px - nearest)
  for (const candidate of HANGUL_FONT_SIZES_PX) {
    const diff = Math.abs(px - candidate)
    if (diff < minDiff) {
      nearest = candidate
      minDiff = diff
    }
  }
  return nearest
}

function readExplicitFontSizePx(el: HTMLElement): number | null {
  const attr = el.getAttribute("data-bp-fz")
  if (attr) {
    const px = Number(attr)
    if (Number.isFinite(px) && px > 0) return px
  }
  const inline = parseFontSizePx(el.style.fontSize)
  if (inline) return inline
  if (el.tagName === "FONT") {
    const legacy = Number(el.getAttribute("size"))
    if (Number.isFinite(legacy) && legacy > 0) {
      const legacyMap = [0, 10, 13, 16, 18, 24, 32, 48]
      return legacyMap[legacy] ?? null
    }
  }
  return null
}

/** 커서/선택 위치의 글자 크기(px) — 툴바 표시용 */
export function getRichTextFontSizePxAtSelection(root: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return DEFAULT_EDITOR_FONT_SIZE_PX

  const node = sel.anchorNode
  if (!node || !root.contains(node)) return DEFAULT_EDITOR_FONT_SIZE_PX

  let el: HTMLElement | null =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement

  while (el && el !== root) {
    const explicit = readExplicitFontSizePx(el)
    if (explicit != null) return explicit
    el = el.parentElement
  }

  const rootInline = parseFontSizePx(root.style.fontSize)
  if (rootInline) return rootInline

  const leaf =
    node.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : node instanceof HTMLElement
        ? node
        : null
  if (leaf) {
    const computed = parseFontSizePx(window.getComputedStyle(leaf).fontSize)
    if (computed) return snapToHangulFontSizePx(computed)
  }

  return DEFAULT_EDITOR_FONT_SIZE_PX
}

function stripExplicitFontSizeInFragment(fragment: DocumentFragment): void {
  fragment.querySelectorAll<HTMLElement>("[data-bp-fz]").forEach((el) => {
    el.style.fontSize = ""
    el.removeAttribute("data-bp-fz")
  })
  fragment.querySelectorAll<HTMLElement>('[style*="font-size"]').forEach((el) => {
    el.style.fontSize = ""
  })
  fragment.querySelectorAll<HTMLElement>("font[size]").forEach((el) => {
    el.removeAttribute("size")
  })
}

function insertCollapsedFontSizeMarker(range: Range, px: number): void {
  const span = document.createElement("span")
  span.style.fontSize = `${px}px`
  span.setAttribute("data-bp-fz", String(px))
  span.appendChild(document.createTextNode("\u200b"))
  range.insertNode(span)

  const sel = window.getSelection()
  if (!sel) return
  const next = document.createRange()
  next.setStart(span.firstChild!, 1)
  next.collapse(true)
  sel.removeAllRanges()
  sel.addRange(next)
}

function applyFontSizeToEntireEditor(root: HTMLElement, px: number): void {
  const size = `${px}px`
  root.style.fontSize = size

  root.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    if (el.style.fontSize) el.style.fontSize = size
  })

  root.querySelectorAll<HTMLElement>("span[data-bp-fz]").forEach((el) => {
    el.style.fontSize = size
    el.setAttribute("data-bp-fz", String(px))
  })

  root.querySelectorAll<HTMLElement>("font").forEach((el) => {
    el.style.fontSize = size
    el.removeAttribute("size")
  })

  const sel = window.getSelection()
  if (sel) {
    const next = document.createRange()
    next.selectNodeContents(root)
    sel.removeAllRanges()
    sel.addRange(next)
  }
}

/** 선택 영역·커서에 px 글자 크기 적용 */
export function applyRichTextFontSizePx(
  root: HTMLElement | null,
  px: number,
  options?: { forceFullEditor?: boolean },
): boolean {
  if (!root || px <= 0) return false
  focusActiveRichTextContainer(root)
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false

  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return false

  const fullEditor =
    options?.forceFullEditor ?? isFullEditorSelection(root, range)

  if (fullEditor) {
    applyFontSizeToEntireEditor(root, px)
    return true
  }

  if (range.collapsed) {
    insertCollapsedFontSizeMarker(range, px)
    return true
  }

  try {
    const fragment = range.extractContents()
    stripExplicitFontSizeInFragment(fragment)
    const span = document.createElement("span")
    span.style.fontSize = `${px}px`
    span.setAttribute("data-bp-fz", String(px))
    span.appendChild(fragment)
    range.insertNode(span)
    sel.removeAllRanges()
    const next = document.createRange()
    next.selectNodeContents(span)
    next.collapse(false)
    sel.addRange(next)
    return true
  } catch {
    const selectedHtml = range.cloneContents()
    stripExplicitFontSizeInFragment(selectedHtml)
    const wrapper = document.createElement("div")
    wrapper.appendChild(selectedHtml)
    const inner = wrapper.innerHTML
    if (!inner) return false
    range.deleteContents()
    const span = document.createElement("span")
    span.style.fontSize = `${px}px`
    span.setAttribute("data-bp-fz", String(px))
    span.innerHTML = inner
    range.insertNode(span)
    sel.removeAllRanges()
    const next = document.createRange()
    next.selectNodeContents(span)
    next.collapse(false)
    sel.addRange(next)
    return true
  }
}
