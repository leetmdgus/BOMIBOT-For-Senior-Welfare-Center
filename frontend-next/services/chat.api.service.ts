import type {
  AssistantQuestionRequest,
  AssistantQuestionResponse,
  ChatAppConfig,
  CsTicketRequest,
  CsTicketResponse,
  OntologyGraphApiResponse,
} from "./chat.types"

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `API 요청 실패: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function getChatConfig(): Promise<ChatAppConfig> {
  const response = await fetch("/api/chat/config")
  return parseJson<ChatAppConfig>(response)
}

export async function askAssistantQuestion(
  payload: AssistantQuestionRequest,
): Promise<AssistantQuestionResponse> {
  const response = await fetch("/api/chat/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson<AssistantQuestionResponse>(response)
}

export async function submitCsTicket(
  payload: CsTicketRequest,
): Promise<CsTicketResponse> {
  const response = await fetch("/api/chat/cs-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson<CsTicketResponse>(response)
}

export async function getOntologyGraph(
  question?: string,
): Promise<OntologyGraphApiResponse> {
  const params = question?.trim()
    ? `?q=${encodeURIComponent(question.trim())}`
    : ""
  const response = await fetch(`/api/chat/ontology${params}`)
  return parseJson<OntologyGraphApiResponse>(response)
}
