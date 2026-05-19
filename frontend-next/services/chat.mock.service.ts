import {
  chatConfigMock,
  submitCsTicketMock,
} from "@/lib/mocks/chat.mock"
import type { ChatConfig, CsTicketRequest, CsTicketResponse } from "./chat.types"

export async function getChatConfig(): Promise<ChatConfig> {
  return structuredClone(chatConfigMock)
}

export async function submitCsTicket(
  payload: CsTicketRequest,
): Promise<CsTicketResponse> {
  return submitCsTicketMock(payload)
}
