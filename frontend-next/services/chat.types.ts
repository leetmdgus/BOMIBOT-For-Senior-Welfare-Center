export interface ChatSuggestion {
  id: string
  text: string
  icon: "barChart" | "fileText" | "search" | "clock" | "alert" | "help"
}

export interface ChatConfig {
  mode: "cs"
  welcomeMessage: string
  placeholderReply: string
  inputPlaceholder: string
  csEmail: string
  maxAttachments: number
  /** 문의 본문 최대 글자 수 */
  maxMessageLength: number
  /** 이미지 1개당 최대 용량(MB) */
  maxImageSizeMb: number
  /** 동영상 1개당 최대 용량(MB) */
  maxVideoSizeMb: number
  suggestions: ChatSuggestion[]
}

export interface ChatAttachmentPayload {
  name: string
  type: string
  dataUrl: string
}

export interface CsTicketRequest {
  message: string
  attachments: ChatAttachmentPayload[]
  pageUrl?: string
  contactEmail?: string
}

export interface CsTicketResponse {
  ticketId: string
  emailSent: boolean
  sentTo: string
  message: string
}

export interface ChatMessageAttachment {
  id: string
  name: string
  previewUrl: string
  type: string
}
