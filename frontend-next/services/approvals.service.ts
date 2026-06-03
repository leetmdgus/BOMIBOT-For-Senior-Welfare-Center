import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./approvals.api.service"
import * as mockService from "./approvals.mock.service"

const approvalsService = shouldUseMockApi() ? mockService : apiService

export const listApprovals = approvalsService.listApprovals
export const createApproval = approvalsService.createApproval
export const updateApproval = approvalsService.updateApproval
export const deleteApproval = approvalsService.deleteApproval

export type {
  ApprovalDocument,
  ApprovalStatus,
  CreateApprovalPayload,
} from "./approvals.types"
