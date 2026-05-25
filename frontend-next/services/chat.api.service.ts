import type {
  AssistantQuestionRequest,
  AssistantQuestionResponse,
  ChatAppConfig,
  CsTicketRequest,
  CsTicketResponse,
  OntologyGraphApiResponse,
} from "./chat.types"
import { apiClient, resolveApiPath } from "@/lib/api-client"

const chatPath = (suffix: string) =>
  resolveApiPath(`/api/chat${suffix}`, `/api/v1/chat${suffix}`)

export async function getChatConfig(): Promise<ChatAppConfig> {
  return apiClient.get<ChatAppConfig>(chatPath("/config"))
}

export async function saveChatConfig(
  payload: Partial<ChatAppConfig>,
): Promise<ChatAppConfig> {
  return apiClient.patch<ChatAppConfig>(chatPath("/config"), payload)
}

export async function askAssistantQuestion(
  payload: AssistantQuestionRequest,
): Promise<AssistantQuestionResponse> {
  return apiClient.post<AssistantQuestionResponse>(chatPath("/assistant"), payload)
}

export async function submitCsTicket(
  payload: CsTicketRequest,
): Promise<CsTicketResponse> {
  return apiClient.post<CsTicketResponse>(chatPath("/cs-ticket"), payload)
}

export async function getOntologyGraph(
  question?: string,
): Promise<OntologyGraphApiResponse> {
  const params = question?.trim()
    ? `?q=${encodeURIComponent(question.trim())}`
    : ""
  return apiClient.get<OntologyGraphApiResponse>(`${chatPath("/ontology")}${params}`)
}
