import Link from "next/link"

export function SurveyTabNavigation({ id }: { id: string }) {
  return (
    <div className="border-b border-border bg-card px-6">
      <div className="flex items-center justify-end gap-8">
        <Link
          href={`/task/${id}/performance`}
          className="py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          실적관리
        </Link>

        <Link
          href={`/task/${id}/business-plan`}
          className="py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          사업계획
        </Link>

        <span className="border-b-2 border-primary py-3 text-sm font-medium text-primary">
          만족도조사
        </span>

        <Link
          href={`/task/${id}/evaluation`}
          className="py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          사업평가
        </Link>
      </div>
    </div>
  )
}