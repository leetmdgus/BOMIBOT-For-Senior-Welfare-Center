"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Header } from "@common/layouts/header"
import { Sidebar } from "@common/layouts/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createApproval,
  deleteApproval,
  listApprovals,
  updateApproval,
} from "@/services/approvals.service"
import type { ApprovalDocument, ApprovalStatus } from "@/services/approvals.types"

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  draft: "임시저장",
  pending: "결재중",
  approved: "승인",
  rejected: "반려",
}

export function ApprovalsPage() {
  const [documents, setDocuments] = useState<ApprovalDocument[]>([])
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all")
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listApprovals(
        filter === "all" ? undefined : { status: filter },
      )
      setDocuments(list)
    } catch (error) {
      console.error("전자결재 목록 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate() {
    const trimmed = title.trim()
    if (!trimmed) return
    await createApproval({ title: trimmed, status: "draft", type: "일반" })
    setTitle("")
    await load()
  }

  async function handleStatusChange(id: string, status: ApprovalStatus) {
    await updateApproval(id, { status })
    await load()
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 결재 문서를 삭제할까요?")) return
    await deleteApproval(id)
    await load()
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Header />
        <div className="flex-1 space-y-6 p-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-sm text-muted-foreground">
                상태 필터
              </label>
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as ApprovalStatus | "all")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="draft">임시저장</SelectItem>
                  <SelectItem value="pending">결재중</SelectItem>
                  <SelectItem value="approved">승인</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 min-w-[240px] gap-2">
              <Input
                placeholder="새 결재 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
              />
              <Button type="button" onClick={() => void handleCreate()}>
                <Plus className="size-4" />
                추가
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">결재 문서가 없습니다.</p>
          ) : (
            <ul className="divide-y rounded-xl border border-border bg-card">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type} · {doc.requester || "—"} · {doc.department || "—"} ·{" "}
                      {doc.updatedAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={doc.status}
                      onValueChange={(v) =>
                        void handleStatusChange(doc.id, v as ApprovalStatus)
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABEL) as ApprovalStatus[]).map(
                          (s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDelete(doc.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
