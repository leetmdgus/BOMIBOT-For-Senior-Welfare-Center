import Link from "next/link"

export function SurveyBreadcrumb() {
  return (
    <div className="print-hide border-b border-border bg-card px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            사업관리
          </Link>
          <span>{">"}</span>
          <Link href="/" className="hover:text-foreground">
            대시보드
          </Link>
          <span>{">"}</span>
          <span className="font-medium text-foreground">
            상담 [1-1 일반상담]
          </span>
        </div>
      </div>
    </div>
  )
}