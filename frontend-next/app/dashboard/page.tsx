"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  Users,
  Layers,
  TrendingUp,
  ChevronRight,
  Calendar as CalendarIcon,
  DollarSign,
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type CalendarTab = "all" | "welfare" | "team"

interface StatCardData {
  label: string
  labelEn: string
  value: string
  unit: string
  description: string
  icon: React.ElementType
  color: string
  link?: string
  showChart?: boolean
  goto?: string
}

interface ProgressCardData {
  label: string
  value: number
  icon: React.ElementType
  color: string
  textColor: string
}

interface CalendarEvent {
  day: number
  title: string
  color: string
}

interface VolunteerEvent {
  id: string
  title: string
  date: string
  type: string
}

const statsData: StatCardData[] = [
  {
    label: "인원 현황",
    labelEn: "PERSONNEL STATUS",
    value: "45",
    unit: "명",
    description: "전년 대비 2명 증가 (신규 채용 포함)",
    icon: Users,
    color: "bg-primary/10 text-primary",
    link: "전체 직원 현황 보기",
    goto: "/organization"
  },
  {
    label: "활성 프로젝트",
    labelEn: "ACTIVE PROJECTS",
    value: "12",
    unit: "개",
    description: "2026년도 사업계획 승인 완료 기준",
    icon: Layers,
    color: "bg-primary/10 text-primary",
    link: "사업계획 및 실적 관리",
    goto: "/kanban"
  },
  {
    label: "서비스 이용자",
    labelEn: "SERVICE USERS",
    value: "8,420",
    unit: "명",
    description: "최근 3개월 누적 이용자 추이",
    icon: TrendingUp,
    color: "bg-primary/10 text-primary",
    showChart: true,
  },
]

const progressData: ProgressCardData[] = [
  {
    label: "인원 달성률",
    value: 85,
    icon: Users,
    color: "bg-primary",
    textColor: "text-primary",
  },
  {
    label: "횟수 달성률",
    value: 92,
    icon: CalendarIcon,
    color: "bg-success",
    textColor: "text-success",
  },
  {
    label: "예산 집행률",
    value: 74,
    icon: DollarSign,
    color: "bg-[hsl(280,60%,50%)]",
    textColor: "text-[hsl(280,60%,50%)]",
  },
]

const calendarEvents: CalendarEvent[] = [
  { day: 1, title: "근로자의 날", color: "bg-amber-400" },
  { day: 5, title: "어린이날", color: "bg-rose-400" },
]

const volunteerEvents: VolunteerEvent[] = [
  { id: "v1", title: "치매예방 캠페인", date: "2026.05.10", type: "정기" },
]

const days = ["일", "월", "화", "수", "목", "금", "토"]
const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1)

export default function DashboardPage() {
  const { data: dashboardData } = useSWR("/api/dashboard", fetcher)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [calendarTab, setCalendarTab] = useState<CalendarTab>("all")
  const [year, setYear] = useState("2026")

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1">
        <Header />

        <div className="p-6">
          <GreetingCard currentTime={currentTime} />
          <StatsGrid stats={statsData} />
          <ProgressGrid progressItems={progressData} />

          <div className="grid grid-cols-[1fr_350px] gap-6">
            <ScheduleCalendar
              calendarTab={calendarTab}
              onCalendarTabChange={setCalendarTab}
              events={calendarEvents}
            />

            <VolunteerCard events={volunteerEvents} />
          </div>
        </div>
      </main>
    </div>
  )
}

function GreetingCard({ currentTime }: { currentTime: Date }) {
  return (
    <Card className="mb-6 overflow-hidden">
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-12 bg-primary/10">
            <AvatarFallback className="text-primary text-lg">이</AvatarFallback>
          </Avatar>

          <div>
            <h3 className="text-xl font-semibold">
              이승현 사회복지사님 안녕하세요.
            </h3>
            <p className="text-muted-foreground">
              오늘도 힘찬 하루 되세요! 기관 운영 현황을 요약해 드립니다.
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
            {formatTime(currentTime)}
          </p>
          <p className="mt-1 text-sm text-primary">{formatDate(currentTime)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatsGrid({ stats }: { stats: StatCardData[] }) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-6">
      {stats.map((stat) => (
        <StatCard key={stat.labelEn} stat={stat} />
      ))}
    </div>
  )
}

function StatCard({ stat }: { stat: StatCardData }) {
  const Icon = stat.icon

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {stat.labelEn}
            </p>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{stat.value}</span>
              <span className="text-xl text-muted-foreground">{stat.unit}</span>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {stat.description}
            </p>

            {stat.link && stat.goto && (
            <Link href={stat.goto}>
              <Button
                variant="ghost"
                className="mt-3 h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
              >
                {stat.link}
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </Link>
          )}
          </div>

          <div className={cn("rounded-xl p-3", stat.color)}>
            <Icon className="size-6" />
          </div>
        </div>

        {stat.showChart && <MiniTrendChart />}
      </CardContent>
    </Card>
  )
}

function MiniTrendChart() {
  return (
    <div className="absolute bottom-0 right-0 h-24 w-32">
      <svg viewBox="0 0 100 50" className="h-full w-full text-primary/20">
        <path
          d="M0,45 Q25,40 35,30 T60,25 T85,15 T100,10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}

function ProgressGrid({
  progressItems,
}: {
  progressItems: ProgressCardData[]
}) {
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

function ScheduleCalendar({
  calendarTab,
  onCalendarTabChange,
  events,
}: {
  calendarTab: CalendarTab
  onCalendarTabChange: (tab: CalendarTab) => void
  events: CalendarEvent[]
}) {
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

function VolunteerCard({ events }: { events: VolunteerEvent[] }) {
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

function formatTime(date: Date) {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })
}