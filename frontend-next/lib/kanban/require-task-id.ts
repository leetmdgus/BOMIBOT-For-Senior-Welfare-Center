/** 칸반 업무(카드) API 호출 시 taskId 필수 */
export function requireTaskId(taskId: string | undefined | null): string {
  const id = (taskId ?? "").trim()
  if (!id) {
    throw new Error("taskId is required")
  }
  return id
}
