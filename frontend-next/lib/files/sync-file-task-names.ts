import type { FileItem, TaskOption } from "@/components/files/file-types"

/** 칸반 taskOptions(카드명)으로 파일 목록의 담당 업무 표시명 동기화 */
export function syncFileTaskNames(
  files: FileItem[],
  taskOptions: TaskOption[],
): FileItem[] {
  if (taskOptions.length === 0) return files

  const nameById = new Map(taskOptions.map((task) => [task.id, task.name]))

  return files.map((file) => {
    if (!file.taskId) return file
    const name = nameById.get(file.taskId)
    if (!name || file.taskName === name) return file
    return { ...file, taskName: name }
  })
}
