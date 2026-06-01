const KST_OFFSET = "+09:00"

/** 버전 기록 등 백엔드/KST 문자열을 Date로 변환 */
export function parseKstDateString(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const normalized = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T")

  const parsed = new Date(`${normalized}${KST_OFFSET}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatKstDateTime(
  value: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const parsed = parseKstDateString(value)
  if (!parsed) return value

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
    ...options,
  }).format(parsed)
}
