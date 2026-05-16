"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/dashboard/sidebar"
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
  Filter,
  Download,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface StatCard {
  label: string
  labelEn: string
  value: string
  unit: string
  description: string
  icon: React.ElementType
  color: string
  link?: string
}

interface ProgressCard {
  label: string
  value: number
  icon: React.ElementType
  color: string
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

const statsData: StatCard[] = [
  {
    label: "인원 현황",
    labelEn: "PERSONNEL STATUS",
    value: "45",
    unit: "명",
    description: "전년 대비 2명 증가 (신규 채용 포함)",
    icon: Users,
    color: "bg-primary/10 text-primary",
    link: "전체 직원 현황 보기",
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
  },
  {
    label: "서비스 이용자",
    labelEn: "SERVICE USERS",
    value: "8,420",
    unit: "명",
    description: "최근 3개월 누적 이용자 추이",
    icon: TrendingUp,
    color: "bg-primary/10 text-primary",
  },
]

const progressData: ProgressCard[] = [
  { label: "인원 달성률", value: 85, icon: Users, color: "bg-primary" },
  { label: "횟수 달성률", value: 92, icon: CalendarIcon, color: "bg-success" },
  { label: "예산 집행률", value: 74, icon: DollarSign, color: "bg-[hsl(280,60%,50%)]" },
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

type CalendarTab = "all" | "welfare" | "team"

export default function DashboardPage() {
  const { data: dashboardData } = useSWR("/api/dashboard", fetcher)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [calendarTab, setCalendarTab] = useState<CalendarTab>("all")

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }
    return date.toLocaleDateString("ko-KR", options)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1">
        {/* Header */} 
        <div className="border-border bg-card/50 px-8 pt-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <h2 className="mt-1 text-lg font-semibold">통합 운영 대시보드</h2>
          </div>
        </div>

        {/* Sub Header */}
        <div className="border-b border-border bg-card/50 px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>산하기관</span>
            <ChevronRight className="size-4" />
            <span>춘천북부노인복지관</span>
            <ChevronRight className="size-4" />
            <span className="text-primary">대시보드</span>
          </div>
        </div>

        <div className="p-6">
          {/* Greeting Card */}
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

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-3 gap-6">
            {statsData.map((stat) => (
              <Card key={stat.labelEn} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {stat.labelEn}
                      </p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-4xl font-bold">{stat.value}</span>
                        <span className="text-xl text-muted-foreground">
                          {stat.unit}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {stat.description}
                      </p>
                      {stat.link && (
                        <Button
                          variant="ghost"
                          className="mt-3 h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                        >
                          {stat.link}
                          <ChevronRight className="ml-1 size-4" />
                        </Button>
                      )}
                    </div>
                    <div className={cn("rounded-xl p-3", stat.color)}>
                      <stat.icon className="size-6" />
                    </div>
                  </div>
                  {stat.labelEn === "SERVICE USERS" && (
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
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress Cards */}
          <div className="mb-6 grid grid-cols-3 gap-6">
            {progressData.map((progress) => (
              <Card key={progress.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <progress.icon className="size-5 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{progress.label}</span>
                    </div>
                    <span
                      className={cn(
                        "text-2xl font-bold",
                        progress.color === "bg-primary" && "text-primary",
                        progress.color === "bg-success" && "text-success",
                        progress.color === "bg-[hsl(280,60%,50%)]" && "text-[hsl(280,60%,50%)]"
                      )}
                    >
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
            ))}
          </div>

          {/* Calendar and Volunteer Section */}
          <div className="grid grid-cols-[1fr_350px] gap-6">
            {/* Calendar */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <CalendarIcon className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">복지관 일정</h3>
                      <p className="text-xs text-muted-foreground">
                        INSTITUTION SCHEDULE · MAY 2026
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[
                      { id: "all", label: "전체일정" },
                      { id: "welfare", label: "복지관" },
                      { id: "team", label: "복지팀" },
                    ].map((tab) => (
                      <Button
                        key={tab.id}
                        variant={calendarTab === tab.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCalendarTab(tab.id as CalendarTab)}
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
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
                  {/* Days Header */}
                  {days.map((day, i) => (
                    <div
                      key={day}
                      className={cn(
                        "bg-muted py-2 text-center text-xs font-medium",
                        i === 0 && "text-rose-500",
                        i === 6 && "text-primary"
                      )}
                    >
                      {day}
                    </div>
                  ))}

                  {/* Empty cells for May 2026 (starts on Friday) */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-card p-2" />
                  ))}

                  {/* Calendar Days */}
                  {calendarDays.map((day) => {
                    const event = calendarEvents.find((e) => e.day === day)
                    const dayOfWeek = (day + 4) % 7 // May 2026 starts on Friday

                    return (
                      <div
                        key={day}
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
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Volunteer Management */}
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
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary">
                      WEEKLY
                    </Button>
                  </div>

                  {volunteerEvents.map((event) => (
                    <div
                      key={event.id}
                      className="mt-3 flex items-center gap-3 rounded-lg border border-border p-3"
                    >
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
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
