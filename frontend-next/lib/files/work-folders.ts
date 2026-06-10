import type { FileItem, TaskOption } from "@/components/files/file-types"

/** taskId가 없는 파일을 모으는 가상 폴더 키 */
export const TASK_UNASSIGNED = "__unassigned__"
/** 가상 업무 폴더의 아이템 id 접두사 (실제 파일/폴더 id와 구분) */
export const WORK_FOLDER_PREFIX = "workfolder:"
export const UNASSIGNED_FOLDER_NAME = "업무 미지정"

/** 업무(=업무 폴더) 단위로 묶인 파일 그룹 */
export interface WorkFolder {
  /** taskId 또는 TASK_UNASSIGNED */
  key: string
  /** 가상 폴더 아이템 id: `${WORK_FOLDER_PREFIX}${key}` */
  id: string
  /** 업무명 (미지정이면 "업무 미지정") */
  name: string
  /** 업무가 속한 사업 연도 (미지정 폴더는 없음) */
  year?: string
  /** 폴더 안 파일 수 */
  fileCount: number
  /** 폴더 안 파일 중 가장 최근 수정일 (표시·정렬용) */
  latestModifiedAt: string
}

/** 파일이 속한 업무 폴더 키 (taskId 없으면 미지정) */
export function taskKeyOf(file: FileItem): string {
  return file.taskId?.trim() ? file.taskId : TASK_UNASSIGNED
}

export function isWorkFolderId(id: string): boolean {
  return id.startsWith(WORK_FOLDER_PREFIX)
}

export function workFolderKeyFromId(id: string): string {
  return id.slice(WORK_FOLDER_PREFIX.length)
}

/**
 * 평면(flat) 모델: 실제 폴더 계층은 무시하고, 파일(=비폴더)을 taskId 기준으로 묶어
 * 업무 폴더 목록을 만든다. 지정 업무는 업무명 오름차순, 미지정 폴더는 항상 맨 끝.
 */
export function buildWorkFolders(
  files: FileItem[],
  taskOptions: TaskOption[],
): WorkFolder[] {
  const taskById = new Map(taskOptions.map((task) => [task.id, task]))
  const grouped = new Map<
    string,
    { count: number; latest: string; taskName?: string }
  >()

  for (const file of files) {
    if (file.type === "folder") continue
    const key = taskKeyOf(file)
    const prev = grouped.get(key)
    if (!prev) {
      grouped.set(key, {
        count: 1,
        latest: file.modifiedAt,
        taskName: file.taskName?.trim() || undefined,
      })
    } else {
      prev.count += 1
      if (file.modifiedAt > prev.latest) prev.latest = file.modifiedAt
      if (!prev.taskName && file.taskName?.trim()) prev.taskName = file.taskName.trim()
    }
  }

  const folders: WorkFolder[] = []
  for (const [key, { count, latest, taskName }] of grouped) {
    if (key === TASK_UNASSIGNED) {
      folders.push({
        key,
        id: `${WORK_FOLDER_PREFIX}${key}`,
        name: UNASSIGNED_FOLDER_NAME,
        fileCount: count,
        latestModifiedAt: latest,
      })
      continue
    }
    const task = taskById.get(key)
    // 업무명: 칸반 옵션 > 파일에 기록된 업무명 > 키(최후의 수단)
    folders.push({
      key,
      id: `${WORK_FOLDER_PREFIX}${key}`,
      name: task?.name ?? taskName ?? key,
      year: task?.year,
      fileCount: count,
      latestModifiedAt: latest,
    })
  }

  // 지정 업무: 업무명 오름차순 / 미지정: 항상 맨 끝
  return folders.sort((a, b) => {
    const aUnassigned = a.key === TASK_UNASSIGNED
    const bUnassigned = b.key === TASK_UNASSIGNED
    if (aUnassigned !== bUnassigned) return aUnassigned ? 1 : -1
    return a.name.localeCompare(b.name, "ko")
  })
}

/** 업무 폴더가 가진 연도 목록 (최근 연도 내림차순) */
export function collectYearOptions(folders: WorkFolder[]): string[] {
  const years = new Set<string>()
  for (const folder of folders) {
    if (folder.year) years.add(folder.year)
  }
  return Array.from(years).sort((a, b) => b.localeCompare(a, "ko"))
}

/** 가상 업무 폴더를 브레드크럼/카드가 다룰 수 있는 FileItem 형태로 변환 */
export function workFolderToFileItem(folder: WorkFolder): FileItem {
  return {
    id: folder.id,
    name: folder.name,
    type: "folder",
    parentId: null,
    createdAt: folder.latestModifiedAt,
    modifiedAt: folder.latestModifiedAt,
    permission: "private",
  }
}
