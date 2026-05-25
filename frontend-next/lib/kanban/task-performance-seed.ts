const PERFORMANCE_MONTHS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
] as const

/** 업무 ID → 안정적인 숫자 시드 (task-0516816e 등 UUID형 포함) */
export function taskPerformanceSeedIndex(taskId: string): number {
  const tid = taskId.trim()
  const digits = tid.replace(/\D/g, "")
  if (digits) {
    const tail = digits.slice(-8)
    return (Number.parseInt(tail, 10) % 96) + 1
  }
  let sum = 0
  for (let i = 0; i < tid.length; i += 1) {
    sum += tid.charCodeAt(i)
  }
  return (sum % 96) + 1
}

export function taskPerformanceSeedMonth(taskId: string): string {
  const index = taskPerformanceSeedIndex(taskId)
  return PERFORMANCE_MONTHS[(index - 1) % 12]
}
