/**
 * HWPX(OWPML) 텍스트·ZIP 인코딩 — 한글 깨짐 방지
 * @see https://tech.hancom.com/python-hwpx-parsing-2/
 */

const INVALID_XML_CHAR =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFDD0-\uFDEF\uFFFE\uFFFF]|[\uD800-\uDFFF]/g

/** XML 1.0 + 한글 호환: 제어문자·서로게이트 제거, NFC 정규화 */
export function sanitizeHwpxText(value: string): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(INVALID_XML_CHAR, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
}

export function escapeXml(value: string): string {
  return sanitizeHwpxText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** ZIP 내부 XML·미리보기 — UTF-8 바이트 고정 (JSZip 문자열 인코딩 이슈 회피) */
export function encodeHwpxUtf8(content: string): Uint8Array {
  return new TextEncoder().encode(content)
}

/** hp:t — 앞뒤 공백·탭은 xml:space="preserve" (한글 띄어쓰기 유지) */
export function hpTextRun(charId: string, text: string): string {
  const normalized = sanitizeHwpxText(text)
  const payload = normalized.length > 0 ? normalized : " "
  const escaped = escapeXml(payload)
  const needsPreserve =
    payload !== payload.trim() ||
    /^[\t ]/.test(payload) ||
    /[\t ]$/.test(payload)
  const spaceAttr = needsPreserve ? ' xml:space="preserve"' : ""
  return `<hp:run charPrIDRef="${charId}"><hp:t${spaceAttr}>${escaped}</hp:t></hp:run>`
}

/** 여러 줄 → hp:t + hp:lineBreak */
export function hpTextRuns(charId: string, text: string): string {
  const safe = sanitizeHwpxText(text)
  const lines = safe.split("\n")

  if (lines.length === 0 || (lines.length === 1 && !lines[0])) {
    return hpTextRun(charId, " ")
  }

  return lines
    .map((line, index) => {
      const breakXml =
        index < lines.length - 1
          ? `<hp:run charPrIDRef="${charId}"><hp:lineBreak/></hp:run>`
          : ""
      return `${hpTextRun(charId, line || " ")}${breakXml}`
    })
    .join("")
}

/** HTML 엔티티(&nbsp; 등) 복원 후 순수 텍스트 */
export function decodeHtmlEntities(value: string): string {
  if (!value) return ""
  if (typeof document !== "undefined") {
    const el = document.createElement("textarea")
    el.innerHTML = value
    return el.value
  }
  return value
    .replace(/&nbsp;/gi, "\u00A0")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
}
