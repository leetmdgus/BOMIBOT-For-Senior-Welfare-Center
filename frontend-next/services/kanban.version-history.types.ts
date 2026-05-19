export type VersionHistoryActionType =
  | "update_title"
  | "move_card"
  | "update_description"
  | "update_assignee"
  | "create_task"
  | "delete_task"
  | "update_project"
  | "create_project"

export interface VersionHistoryChange {
  label: string
  before?: string
  after?: string
}

export interface VersionHistoryEntry {
  id: string
  user: string
  userTeam?: string
  target: string
  projectName?: string
  actionType: VersionHistoryActionType
  action: string
  date: string
  canRestore: boolean
  changes: VersionHistoryChange[]
}

export interface VersionHistoryQuery {
  year?: string
  actionType?: VersionHistoryActionType | "all"
  query?: string
}

export interface RestoreVersionHistoryResult {
  success: boolean
  historyId: string
  message: string
}

export const VERSION_HISTORY_ACTION_LABELS: Record<
  VersionHistoryActionType,
  string
> = {
  update_title: "제목 수정",
  move_card: "카드 이동",
  update_description: "설명 수정",
  update_assignee: "담당자 변경",
  create_task: "업무 추가",
  delete_task: "업무 삭제",
  update_project: "프로젝트 수정",
  create_project: "프로젝트 생성",
}
