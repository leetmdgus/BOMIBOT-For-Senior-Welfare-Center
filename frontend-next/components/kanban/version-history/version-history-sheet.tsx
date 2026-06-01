"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { GitBranch, Loader2, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import {
  getVersionHistory,
  restoreVersionHistory,
} from "@/services/kanban.version-history.service"
import type {
  VersionHistoryActionType,
  VersionHistoryEntry,
} from "@/services/kanban.version-history.types"
import { VERSION_HISTORY_ACTION_LABELS } from "@/services/kanban.version-history.types"

import { getCurrentYearString } from "@/lib/current-year"
import { VersionHistoryItem } from "./version-history-item"

const ACTION_FILTER_OPTIONS: Array<{
  value: VersionHistoryActionType | "all"
  label: string
}> = [
  { value: "all", label: "전체 유형" },
  ...(
    Object.entries(VERSION_HISTORY_ACTION_LABELS) as Array<
      [VersionHistoryActionType, string]
    >
  ).map(([value, label]) => ({ value, label })),
]

interface VersionHistorySheetProps {
  year?: string
  isAdmin?: boolean
}

export function VersionHistorySheet({
  year = getCurrentYearString(),
  isAdmin = true,
}: VersionHistorySheetProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<VersionHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState<
    VersionHistoryActionType | "all"
  >("all")

  const loadHistories = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await getVersionHistory({
        year,
        actionType: actionFilter,
        query: searchQuery,
      })
      setEntries(data)
    } catch (error) {
      console.error("버전 기록 로드 실패:", error)
      toast({
        title: "버전 기록을 불러오지 못했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [year, actionFilter, searchQuery, toast])

  useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      loadHistories()
    }, searchQuery ? 300 : 0)

    return () => clearTimeout(timer)
  }, [open, loadHistories, searchQuery])

  const restorableCount = useMemo(
    () => entries.filter((entry) => entry.canRestore).length,
    [entries]
  )

  const handleRestore = async (historyId: string) => {
    const confirmed = window.confirm(
      "선택한 시점으로 되돌리시겠습니까?\n이후 변경 사항은 취소될 수 있습니다."
    )

    if (!confirmed) return

    setRestoringId(historyId)

    try {
      const result = await restoreVersionHistory(historyId)

      if (!result.success) {
        toast({
          title: result.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: result.message,
      })

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("kanban-version-restored", {
            detail: {
              year: result.year ?? year,
              projectId: result.projectId,
            },
          }),
        )
      }

      await loadHistories()
    } catch (error) {
      console.error("버전 복원 실패:", error)
      toast({
        title: "복원에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <GitBranch className="size-4" />
          버전 기록
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex h-full w-full min-h-0 flex-col gap-0 overflow-hidden border-l border-border bg-background p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle>버전 기록</SheetTitle>
          <SheetDescription>
            칸반 보드의 변경 이력을 확인하고 이전 상태로 되돌릴 수 있습니다.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 border-b border-border px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="사업명, 대상, 담당자 검색"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 border-border bg-muted/40 pl-9"
            />
          </div>

          <Select
            value={actionFilter}
            onValueChange={(value) =>
              setActionFilter(value as VersionHistoryActionType | "all")
            }
          >
            <SelectTrigger className="h-10 border-border bg-muted/40">
              <SelectValue placeholder="변경 유형" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-card text-card-foreground">
              {ACTION_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground">
            {year}년 · 총 {entries.length}건
            {restorableCount > 0 ? ` · 복원 가능 ${restorableCount}건` : ""}
          </p>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4"
          onWheel={(event) => event.stopPropagation()}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">버전 기록을 불러오는 중입니다.</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <p className="text-sm font-medium text-foreground">
                표시할 기록이 없습니다.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                검색어나 필터 조건을 변경해 보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {entries.map((entry) => (
                <VersionHistoryItem
                  key={entry.id}
                  entry={entry}
                  isAdmin={isAdmin}
                  isRestoring={restoringId === entry.id}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
