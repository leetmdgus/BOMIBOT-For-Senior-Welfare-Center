/** 브라우저 로컬 기준 현재 연도 (칸반·문서 UI 기본값) */

export function getCurrentYearNumber(): number {
  return new Date().getFullYear()
}

export function getCurrentYearString(): string {
  return String(getCurrentYearNumber())
}

/** 연도 선택: 현재 연도 기준 이전/이후 범위 */
export function getYearSelectOptions(
  yearsBefore = 2,
  yearsAfter = 1,
): string[] {
  const current = getCurrentYearNumber()
  const years: string[] = []
  for (let year = current - yearsBefore; year <= current + yearsAfter; year++) {
    years.push(String(year))
  }
  return years
}

export function getCurrentMonthNumber(): number {
  return new Date().getMonth() + 1
}

const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const

export function getCalendarMonthMeta(year: number, month: number) {
  const leadingBlanks = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month
  return {
    leadingBlanks,
    daysInMonth,
    todayDay: isCurrentMonth ? today.getDate() : -1,
    monthLabel: MONTH_LABELS[month - 1] ?? "MON",
  }
}
