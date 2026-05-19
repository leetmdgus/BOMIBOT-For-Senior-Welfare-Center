import { NextResponse } from "next/server"
import { dashboardStats, schedules, volunteers } from "@/lib/mocks/kanban.board.mock"

export async function GET() {
  return NextResponse.json({
    stats: dashboardStats,
    schedules,
    volunteers,
    currentTime: new Date().toISOString(),
  })
}
