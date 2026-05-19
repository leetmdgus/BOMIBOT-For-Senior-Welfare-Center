import { Calendar as CalendarIcon, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { VolunteerEvent } from "@/services/dashboard.types"

interface VolunteerCardProps {
  events: VolunteerEvent[]
}

export function VolunteerCard({ events }: VolunteerCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <Avatar className="size-10 bg-primary/10">
            <AvatarFallback className="text-primary">
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

        <div className="mb-4">
          <p className="text-xs text-muted-foreground">오늘의 봉사</p>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            오늘의 예정된 봉사활동이 없습니다.
          </p>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">최근 완료 봉사</p>

            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary"
            >
              WEEKLY
            </Button>
          </div>

          {events.map((event) => (
            <VolunteerEventItem key={event.id} event={event} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function VolunteerEventItem({ event }: { event: VolunteerEvent }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="rounded-lg bg-muted p-2">
        <CalendarIcon className="size-4 text-muted-foreground" />
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium">{event.title}</p>
        <p className="text-xs text-muted-foreground">{event.date}</p>
      </div>

      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
        {event.type}
      </span>
    </div>
  )
}