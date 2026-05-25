"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"
import { GreetingCard } from "./greeting-card"
import { StatsGrid } from "./stats-grid"
import { ProgressGrid } from "./progress-grid"
import { ScheduleCalendar } from "./schedule-calendar"
import { VolunteerCard } from "./volunteer-card"
import { useAuth } from "@/components/auth/auth-provider"
import { ApiError } from "@/lib/api-client"
import { getDashboardOverview } from "@/services/dashboard.service"
import { CalendarTab, DashboardOverview } from "@/services/dashboard.types"

export function DashboardPage() {
  const { session, isLoading: authLoading } = useAuth()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [calendarTab, setCalendarTab] = useState<CalendarTab>("all")

  useEffect(() => {
    if (authLoading) return
    if (!session?.token) {
      setLoadError("로그인이 필요합니다.")
      return
    }

    setIsRefreshing(true)
    setLoadError(null)
    getDashboardOverview()
      .then((data) => {
        setOverview(data)
        setLoadError(null)
      })
      .catch((error) => {
        const message =
          error instanceof ApiError
            ? error.message
            : "대시보드 데이터를 불러오지 못했습니다."
        setLoadError(message)
        console.error("대시보드 데이터 로드 실패:", error)
      })
      .finally(() => {
        setIsRefreshing(false)
      })
  }, [authLoading, session?.token])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)

    return () => clearInterval(timer)
  }, [])

  if (!overview) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1">
          <Header />
          <div className="space-y-6 p-6">
            {loadError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm">
                <p className="text-destructive">{loadError}</p>
                <p className="mt-2 text-muted-foreground">
                  잠시 후 다시 시도하거나 로그아웃 후 재로그인해 주세요.
                </p>
              </div>
            ) : (
              <>
                <div className="h-24 animate-pulse rounded-xl bg-muted/60" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-28 animate-pulse rounded-xl bg-muted/50"
                    />
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
                  <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="relative flex-1">
        <Header />

        {isRefreshing ? (
          <div className="pointer-events-none absolute right-6 top-[4.5rem] z-20 flex items-center gap-2 rounded-md border bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Loader2 className="size-3.5 animate-spin" />
            대시보드 새로고침 중…
          </div>
        ) : null}

        <div className={isRefreshing ? "p-6 opacity-90" : "p-6"}>
          <GreetingCard currentTime={currentTime} />
          <StatsGrid stats={overview.stats} />
          <ProgressGrid progressItems={overview.progress} />

          <div className="grid grid-cols-[1fr_350px] gap-6">
            <ScheduleCalendar
              calendarTab={calendarTab}
              onCalendarTabChange={setCalendarTab}
              events={overview.calendarEvents}
            />

            <VolunteerCard events={overview.volunteerEvents} />
          </div>
        </div>
      </main>
    </div>
  )
}
