import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"
import type {
  ApprovalDocument,
  ApprovalStatus,
  CreateApprovalPayload,
} from "./approvals.types"

const DEFAULT_APPROVALS: ApprovalDocument[] = [
  {
    id: "appr-mock-001",
    title: "사업비 집행 결재 (목업)",
    type: "예산",
    status: "pending",
    requester: "관리자",
    department: "총무팀",
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
  },
]

async function loadApprovals(regionId?: RegionId): Promise<ApprovalDocument[]> {
  try {
    const store = await loadRegionStore({ regionId })
    const docs = (store as { approvals?: { documents?: ApprovalDocument[] } })
      .approvals?.documents
    if (docs?.length) return structuredClone(docs)
  } catch {
    /* region-store may not include approvals in mock */
  }
  return structuredClone(DEFAULT_APPROVALS)
}

let memoryDocs = structuredClone(DEFAULT_APPROVALS)

export async function listApprovals(params?: {
  status?: ApprovalStatus | "all"
}): Promise<ApprovalDocument[]> {
  const docs = await loadApprovals()
  memoryDocs = docs
  if (!params?.status || params.status === "all") return docs
  return docs.filter((d) => d.status === params.status)
}

export async function createApproval(
  payload: CreateApprovalPayload,
): Promise<ApprovalDocument> {
  const created: ApprovalDocument = {
    id: `appr-mock-${Date.now()}`,
    title: payload.title,
    type: payload.type ?? "일반",
    status: payload.status ?? "draft",
    requester: payload.requester ?? "",
    department: payload.department ?? "",
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  }
  memoryDocs = [created, ...memoryDocs]
  return created
}

export async function updateApproval(
  id: string,
  payload: Partial<ApprovalDocument>,
): Promise<ApprovalDocument> {
  const index = memoryDocs.findIndex((d) => d.id === id)
  if (index < 0) throw new Error("Approval not found")
  memoryDocs[index] = {
    ...memoryDocs[index],
    ...payload,
    updatedAt: new Date().toISOString().slice(0, 10),
  }
  return memoryDocs[index]
}

export async function deleteApproval(id: string) {
  memoryDocs = memoryDocs.filter((d) => d.id !== id)
  return { success: true, deletedId: id }
}
