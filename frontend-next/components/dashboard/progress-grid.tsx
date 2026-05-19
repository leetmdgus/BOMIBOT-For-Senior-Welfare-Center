import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ProgressCardData } from "@/services/dashboard.types"

interface ProgressGridProps {
  progressItems: ProgressCardData[]
}

export function ProgressGrid({ progressItems }: ProgressGridProps) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-6">
      {progressItems.map((progress) => (
        <ProgressCard key={progress.label} progress={progress} />
      ))}
    </div>
  )
}

function ProgressCard({ progress }: { progress: ProgressCardData }) {
  const Icon = progress.icon

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Icon className="size-5 text-muted-foreground" />
            </div>

            <span className="font-medium">{progress.label}</span>
          </div>

          <span className={cn("text-2xl font-bold", progress.textColor)}>
            {progress.value}%
          </span>
        </div>

        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", progress.color)}
              style={{ width: `${progress.value}%` }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>INITIAL PLAN</span>
            <span>TARGET ACHIEVED</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}