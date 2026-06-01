import { apiClient, resolveApiPath } from "@/lib/api-client"
import type {
  ApprovalDocument,
  ApprovalStatus,
  CreateApprovalPayload,
} from "./approvals.types"

const path = (suffix = "") =>
  resolveApiPath(`/api/approvals${suffix}`, `/api/v1/approvals${suffix}`)

export async function listApprovals(params?: {
  status?: ApprovalStatus | "all"
}): Promise<ApprovalDocument[]> {
  const q =
    params?.status && params.status !== "all"
      ? `?status=${encodeURIComponent(params.status)}`
      : ""
  return apiClient.get<ApprovalDocument[]>(`${path()}${q}`)
}

export async function createApproval(
  payload: CreateApprovalPayload,
): Promise<ApprovalDocument> {
  return apiClient.post<ApprovalDocument>(path(), payload)
}

export async function updateApproval(
  id: string,
  payload: Partial<ApprovalDocument>,
): Promise<ApprovalDocument> {
  return apiClient.patch<ApprovalDocument>(path(`/${id}`), payload)
}

export async function deleteApproval(id: string): Promise<{
  success: boolean
  deletedId: string
}> {
  return apiClient.delete(path(`/${id}`))
}
