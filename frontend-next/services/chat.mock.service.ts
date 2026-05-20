import { chatAppConfigMock } from "@/lib/mocks/chat.mock"

import type {
  AssistantQuestionRequest,
  AssistantQuestionResponse,
  ChatAppConfig,
  CsTicketRequest,
  CsTicketResponse,
  OntologyGraphApiResponse,
} from "./chat.types"

/**
 * 브라우저 mock 모드: UI 설정은 인메모리, 어시스턴트·CS·온톨로지는 서버 API 경유
 * (LLM·SMTP·그래프 빌드는 서버 전용 — chat.server.service.ts)
 */
export async function getChatConfig(): Promise<ChatAppConfig> {
  return structuredClone(chatAppConfigMock)
}

export async function askAssistantQuestion(
  payload: AssistantQuestionRequest,
): Promise<AssistantQuestionResponse> {
  const response = await fetch("/api/chat/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `어시스턴트 응답 실패: ${response.status}`)
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

  const data = (await response.json()) as CsTicketResponse & { error?: string }

  if (!response.ok) {
    throw new Error(data.error ?? `CS 접수 실패: ${response.status}`)
  }

  return data
}

export async function getOntologyGraph(
  question?: string,
): Promise<OntologyGraphApiResponse> {
  const params = question?.trim()
    ? `?q=${encodeURIComponent(question.trim())}`
    : ""
  const response = await fetch(`/api/chat/ontology${params}`)

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `온톨로지 조회 실패: ${response.status}`)
  }

  return response.json()
}
