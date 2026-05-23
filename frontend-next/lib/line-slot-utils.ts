const SLOT_PLACEHOLDER = "• 한 줄씩 입력하면 목록으로 표시됩니다"

export function parseLineSlots(value: string): string[] {
  if (!value.trim() || value.trim() === SLOT_PLACEHOLDER) return []
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

export function joinLineSlots(lines: string[]): string {
  return lines.filter(Boolean).join("\n")
}

export function lineSlotDisplayValue(value: string): string {
  const lines = parseLineSlots(value)
  return lines.length > 0 ? joinLineSlots(lines) : ""
}

/** 여러 줄 → 불릿 목록 문자열 (표·인쇄용) */
export function formatLineSlotText(value: string): string {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return ""
  if (lines.length === 1) return lines[0]
  return lines.map((line) => `• ${line}`).join("\n")
}

export const LINE_SLOT_PLACEHOLDER = SLOT_PLACEHOLDER
