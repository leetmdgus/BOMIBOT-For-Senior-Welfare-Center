import * as apiService from "./approvals.api.service"
import * as mockService from "./approvals.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"
const approvalsService = useMockApi ? mockService : apiService

export const listApprovals = approvalsService.listApprovals
export const createApproval = approvalsService.createApproval
export const updateApproval = approvalsService.updateApproval
export const deleteApproval = approvalsService.deleteApproval

export type {
  ApprovalDocument,
  ApprovalStatus,
  CreateApprovalPayload,
} from "./approvals.types"
