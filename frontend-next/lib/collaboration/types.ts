export type CollaborationEventType =
  | "connected"
  | "pong"
  | "presence.join"
  | "presence.leave"
  | "presence.update"
  | "document.draft"
  | "document.patch"
  | "document.saved"
  | "kanban.refresh"

export interface PresenceMember {
  userId: string
  userName: string
  focus?: string | null
}

export interface CollaborationMessage {
  type: CollaborationEventType
  room?: string
  clientId?: string
  userId?: string
  userName?: string
  presence?: PresenceMember[]
  focus?: string | null
  payload?: Record<string, unknown>
}
