import type { ChatConfig, CsTicketRequest, CsTicketResponse } from "./chat.types"

export async function getChatConfig(): Promise<ChatConfig> {
  const response = await fetch("/api/chat/config")

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}

export async function submitCsTicket(
  payload: CsTicketRequest,
): Promise<CsTicketResponse> {
  const response = await fetch("/api/chat/cs-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`CS 접수 실패: ${response.status}`)
  }

  return response.json()
}
