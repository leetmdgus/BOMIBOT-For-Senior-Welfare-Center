import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CalendarEvent, CalendarTab } from "@/services/dashboard.types"

interface ScheduleCalendarProps {
  calendarTab: CalendarTab
  onCalendarTabChange: (tab: CalendarTab) => void
  events: CalendarEvent[]
}

const days = ["일", "월", "화", "수", "목", "금", "토"]
const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1)

export function ScheduleCalendar({
  calendarTab,
  onCalendarTabChange,
  events,
}: ScheduleCalendarProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle
            icon={CalendarIcon}
            title="복지관 일정"
            description="INSTITUTION SCHEDULE · MAY 2026"
          />

          <CalendarTabs
            calendarTab={calendarTab}
            onCalendarTabChange={onCalendarTabChange}
          />
        </div>

        <CalendarGrid events={events} />
      </CardContent>
    </Card>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-muted p-2">
        <Icon className="size-5 text-muted-foreground" />
      </div>

      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function CalendarTabs({
  calendarTab,
  onCalendarTabChange,
}: {
  calendarTab: CalendarTab
  onCalendarTabChange: (tab: CalendarTab) => void
}) {
  const tabs: { id: CalendarTab; label: string }[] = [
    { id: "all", label: "전체일정" },
    { id: "welfare", label: "복지관" },
    { id: "team", label: "복지팀" },
  ]

  return (
    <div className="flex gap-1">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={calendarTab === tab.id ? "default" : "ghost"}
          size="sm"
          onClick={() => onCalendarTabChange(tab.id)}
          className={cn(
            "text-xs",
            calendarTab === tab.id &&
              "bg-foreground text-background hover:bg-foreground/90"
          )}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  )
}

function CalendarGrid({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
      {days.map((day, index) => (
        <CalendarWeekDay key={day} day={day} index={index} />
      ))}

      {Array.from({ length: 5 }).map((_, index) => (
        <div key={`empty-${index}`} className="bg-card p-2" />
      ))}

      {calendarDays.map((day) => {
        const event = events.find((item) => item.day === day)
        const dayOfWeek = (day + 4) % 7

        return (
          <CalendarDay
            key={day}
            day={day}
            dayOfWeek={dayOfWeek}
            event={event}
          />
        )
      })}
    </div>
  )
}

function CalendarWeekDay({
  day,
  index,
}: {
  day: string
  index: number
}) {
  return (
    <div
      className={cn(
        "bg-muted py-2 text-center text-xs font-medium",
        index === 0 && "text-rose-500",
        index === 6 && "text-primary"
      )}
    >
      {day}
    </div>
  )
}

function CalendarDay({
  day,
  dayOfWeek,
  event,
}: {
  day: number
  dayOfWeek: number
  event?: CalendarEvent
}) {
  return (
    <div
      className={cn(
        "min-h-[80px] bg-card p-2",
        dayOfWeek === 0 && "text-rose-500",
        dayOfWeek === 6 && "text-primary"
      )}
    >
      <span className="text-sm">{day}</span>

      {event && (
        <div
          className={cn(
            "mt-1 truncate rounded px-1.5 py-0.5 text-[10px] text-white",
            event.color
          )}
        >
          {event.title}
        </div>
      )}
    </div>
  )
}