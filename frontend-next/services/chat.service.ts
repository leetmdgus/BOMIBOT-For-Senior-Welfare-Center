import * as apiService from "./chat.api.service"
import * as mockService from "./chat.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"
const chatService = useMockApi ? mockService : apiService

export const getChatConfig = chatService.getChatConfig
export const submitCsTicket = chatService.submitCsTicket
export const askAssistantQuestion = chatService.askAssistantQuestion
export const getOntologyGraph = chatService.getOntologyGraph
