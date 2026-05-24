import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"

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
const MAY_2026_LEADING_BLANKS = 5
const TODAY_DAY = 24
const MAX_VISIBLE_EVENTS = 2

export function ScheduleCalendar({
  calendarTab,
  onCalendarTabChange,
  events,
}: ScheduleCalendarProps) {
  const filteredEvents =
    calendarTab === "all"
      ? events
      : events.filter((event) => event.category === calendarTab)

  const eventsByDay = groupEventsByDay(filteredEvents)

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            icon={CalendarIcon}
            title="복지관 일정"
            description="INSTITUTION SCHEDULE · MAY 2026"
          />

          <div className="flex flex-wrap items-center gap-2">
            <CalendarLegend />
            <CalendarTabs
              calendarTab={calendarTab}
              onCalendarTabChange={onCalendarTabChange}
            />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" aria-label="이전 달">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[88px] text-center text-sm font-medium">
              2026년 5월
            </span>
            <Button variant="ghost" size="icon" className="size-8" aria-label="다음 달">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <CalendarIcon className="size-3.5" />
              Google 캘린더
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <RefreshCw className="size-3.5" />
              새로고침
            </Button>
          </div>
        </div>

        <CalendarGrid eventsByDay={eventsByDay} />

        <div className="mt-4 flex justify-end">
          <Button
            variant="link"
            className="h-auto p-0 text-xs text-muted-foreground"
          >
            Google 캘린더에서 전체 보기 →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function groupEventsByDay(events: CalendarEvent[]) {
  const map = new Map<number, CalendarEvent[]>()

  for (const event of events) {
    const dayEvents = map.get(event.day) ?? []
    dayEvents.push(event)
    map.set(event.day, dayEvents)
  }

  return map
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

function CalendarLegend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-rose-500" />
        복지관
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-emerald-500" />
        복지3팀
      </span>
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
    { id: "team", label: "복지3팀" },
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
              "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  )
}

function CalendarGrid({
  eventsByDay,
}: {
  eventsByDay: Map<number, CalendarEvent[]>
}) {
  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
      {days.map((day, index) => (
        <CalendarWeekDay key={day} day={day} index={index} />
      ))}

      {Array.from({ length: MAY_2026_LEADING_BLANKS }).map((_, index) => (
        <div key={`empty-${index}`} className="bg-card p-2" />
      ))}

      {calendarDays.map((day) => {
        const dayEvents = eventsByDay.get(day) ?? []
        const dayOfWeek = (day + 4) % 7

        return (
          <CalendarDay
            key={day}
            day={day}
            dayOfWeek={dayOfWeek}
            events={dayEvents}
            isToday={day === TODAY_DAY}
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
        index === 6 && "text-primary",
      )}
    >
      {day}
    </div>
  )
}

function CalendarDay({
  day,
  dayOfWeek,
  events,
  isToday,
}: {
  day: number
  dayOfWeek: number
  events: CalendarEvent[]
  isToday: boolean
}) {
  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS)
  const hiddenCount = events.length - visibleEvents.length

  return (
    <div
      className={cn(
        "min-h-[88px] bg-card p-2",
        dayOfWeek === 0 && "text-rose-500",
        dayOfWeek === 6 && "text-primary",
      )}
    >
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-sm",
          isToday && "bg-primary font-medium text-primary-foreground",
        )}
      >
        {day}
      </span>

      <div className="mt-1 space-y-0.5">
        {visibleEvents.map((event, index) => (
          <div
            key={`${event.day}-${event.title}-${index}`}
            className={cn(
              "truncate rounded px-1.5 py-0.5 text-[10px] leading-tight text-white",
              event.color,
            )}
          >
            {event.title}
          </div>
        ))}

        {hiddenCount > 0 && (
          <p className="px-0.5 text-[10px] text-muted-foreground">
            +{hiddenCount}개 더
          </p>
        )}
      </div>
    </div>
  )
}
