import { Plus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { VolunteerEvent } from "@/services/dashboard.types"

interface VolunteerCardProps {
  events: VolunteerEvent[]
}

const TODAY_DAY = 24

export function VolunteerCard({ events }: VolunteerCardProps) {
  const todayEvents = events.filter(
    (event) => event.status === "scheduled" && event.day === TODAY_DAY,
  )
  const completedEvents = events.filter((event) => event.status === "completed")

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 bg-emerald-500/10">
              <AvatarFallback className="text-emerald-600">
                <Users className="size-5" />
              </AvatarFallback>
            </Avatar>

            <div>
              <h3 className="font-semibold">자원봉사자 일정</h3>
              <p className="text-xs text-muted-foreground">
                VOLUNTEER MANAGEMENT
              </p>
            </div>
          </div>

          <Button size="sm" className="h-8 gap-1 bg-emerald-600 text-xs hover:bg-emerald-600/90">
            <Plus className="size-3.5" />
            일정 등록
          </Button>
        </div>

        <div className="mb-3">
          <p className="text-xs text-muted-foreground">오늘의 봉사자</p>
        </div>

        {todayEvents.length > 0 ? (
          <div className="space-y-2">
            {todayEvents.map((event) => (
              <VolunteerEventItem key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              오늘 예정된 봉사 일정이 없습니다.
            </p>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">최근 완료 봉사 일정</p>

            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary"
            >
              WEEKLY
            </Button>
          </div>

          {completedEvents.map((event) => (
            <VolunteerEventItem key={event.id} event={event} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function VolunteerEventItem({ event }: { event: VolunteerEvent }) {
  const isCompleted = event.status === "completed"

  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <span className="text-sm font-semibold">{event.day}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{event.name}</p>
        <p className="truncate text-xs text-muted-foreground">{event.program}</p>
      </div>

      {isCompleted ? (
        <span className="shrink-0 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
          완료
        </span>
      ) : (
        <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
          예정
        </span>
      )}
    </div>
  )
}
