"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"
import { GreetingCard } from "./greeting-card"
import { StatsGrid } from "./stats-grid"
import { ProgressGrid } from "./progress-grid"
import { ScheduleCalendar } from "./schedule-calendar"
import { VolunteerCard } from "./volunteer-card"
import { useAuth } from "@/components/auth/auth-provider"
import { ApiError } from "@/lib/api-client"
import { ensureSessionCookie } from "@/lib/auth/session"
import { getCurrentYearString } from "@/lib/current-year"
import {
  getDashboardOverview,
  invalidateDashboardCache,
} from "@/services/dashboard.service"
import type {
  CalendarTab,
  DashboardOverview,
  DashboardOverviewDTO,
} from "@/services/dashboard.types"
import { hydrateDashboardOverview } from "@/services/dashboard.utils"

type DashboardPageProps = {
  /** 서버에서 FastAPI로 미리 받은 데이터 (로그인·쿠키 있을 때) */
  initialOverviewDTO?: DashboardOverviewDTO | null
}

export function DashboardPage({
  initialOverviewDTO = null,
}: DashboardPageProps) {
  const { session, isLoading: authLoading } = useAuth()
  const [overview, setOverview] = useState<DashboardOverview | null>(
    initialOverviewDTO ? hydrateDashboardOverview(initialOverviewDTO) : null,
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [calendarTab, setCalendarTab] = useState<CalendarTab>("all")

  const loadDashboard = useCallback(() => {
    if (!session?.token) {
      setLoadError("로그인이 필요합니다.")
      return
    }

    ensureSessionCookie()
    invalidateDashboardCache()
    setIsRefreshing(true)
    setLoadError(null)
    getDashboardOverview(getCurrentYearString())
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
  }, [session?.token, session?.regionId])

  useEffect(() => {
    if (authLoading) return
    loadDashboard()
  }, [authLoading, loadDashboard])

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
                  FastAPI(8020) 실행 여부와 로그인 상태를 확인한 뒤 다시 시도해
                  주세요.
                </p>
                {session?.token ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={loadDashboard}
                  >
                    다시 불러오기
                  </Button>
                ) : null}
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
