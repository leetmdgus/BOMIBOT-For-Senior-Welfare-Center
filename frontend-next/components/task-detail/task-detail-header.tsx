import { ChevronRight } from "lucide-react"

export function TaskDetailHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>사업관리</span>
        <ChevronRight className="size-4" />
        <span>대시보드</span>
        <ChevronRight className="size-4" />
        <span className="font-medium text-foreground">
          상담 [1-1 일반상담]
        </span>
      </div>
    </header>
  )
}