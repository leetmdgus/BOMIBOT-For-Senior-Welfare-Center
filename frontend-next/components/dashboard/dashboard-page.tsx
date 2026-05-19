"use client"

import { useEffect, useState } from "react"

import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"
import { GreetingCard } from "./greeting-card"
import { StatsGrid } from "./stats-grid"
import { ProgressGrid } from "./progress-grid"
import { ScheduleCalendar } from "./schedule-calendar"
import { VolunteerCard } from "./volunteer-card"
import { getDashboardOverview } from "@/services/dashboard.service"
import { CalendarTab, DashboardOverview } from "@/services/dashboard.types"

export function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [calendarTab, setCalendarTab] = useState<CalendarTab>("all")

  useEffect(() => {
    getDashboardOverview()
      .then(setOverview)
      .catch((error) => {
        console.error("대시보드 데이터 로드 실패:", error)
      })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)

    return () => clearInterval(timer)
  }, [])

  if (!overview) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          데이터를 불러오는 중입니다.
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1">
        <Header />

        <div className="p-6">
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
