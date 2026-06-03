import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./chat.api.service"
import * as mockService from "./chat.mock.service"

const chatService = shouldUseMockApi() ? mockService : apiService

export const getChatConfig = chatService.getChatConfig
export const saveChatConfig =
  "saveChatConfig" in chatService ? chatService.saveChatConfig : undefined
export const submitCsTicket = chatService.submitCsTicket
export const askAssistantQuestion = chatService.askAssistantQuestion
export const getOntologyGraph = chatService.getOntologyGraph
