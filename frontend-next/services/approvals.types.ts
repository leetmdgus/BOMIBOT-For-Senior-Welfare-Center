export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected"

export interface ApprovalDocument {
  id: string
  title: string
  type: string
  status: ApprovalStatus
  requester: string
  department: string
  createdAt: string
  updatedAt: string
}

export interface CreateApprovalPayload {
  title: string
  type?: string
  status?: ApprovalStatus
  requester?: string
  department?: string
}
