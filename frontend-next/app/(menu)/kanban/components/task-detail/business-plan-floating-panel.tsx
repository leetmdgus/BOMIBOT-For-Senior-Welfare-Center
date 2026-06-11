"use client"

import Link from "next/link"
import { ExternalLink, FileText, Loader2 } from "lucide-react"

import { BusinessPlanEditor } from "@menu/kanban/components/task-detail/business-plan-editor"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BusinessPlanDocument } from "@/services/kanban.task-detail.types"

type BusinessPlanFloatingPanelProps = {
  taskId: string
  planDocument: BusinessPlanDocument | null
  isLoading: boolean
  className?: string
}

/** 사업평가 우측 참고 사업계획서 — 계획서 탭과 동일한 전체 문서(본문 포함) 읽기 전용 */
export function BusinessPlanFloatingPanel({
  taskId,
  planDocument,
  isLoading,
  className,
}: BusinessPlanFloatingPanelProps) {
  return (
    <aside
      className={cn(
        "plan-floating-panel reference-plan-panel print-hide flex h-full w-full flex-col",
        className,
      )}
      aria-label="참고 사업계획서 (읽기 전용)"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 border border-black/20 bg-[#f2f2f2] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold">참고 · 사업계획서</p>
            <p className="text-[10px] text-neutral-600">
              평가서 작성 중 나란히 확인 · 읽기 전용
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 px-2 text-[10px]"
          asChild
        >
          <Link href={`/kanban/task/${taskId}/business-plan`}>
            <ExternalLink className="mr-1 size-3" />
            계획서 편집
          </Link>
        </Button>
      </div>

      <div className="reference-plan-panel__scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading || !planDocument ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            사업계획서를 불러오는 중…
          </div>
        ) : (
          <BusinessPlanEditor
            formData={planDocument.formData}
            sections={planDocument.sections}
            readOnly
            referenceMode
            onFormDataChange={() => {}}
            onSectionsChange={() => {}}
          />
        )}
      </div>
    </aside>
  )
}
