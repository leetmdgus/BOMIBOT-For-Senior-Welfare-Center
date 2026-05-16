import { NextResponse } from "next/server"
import { dashboardStats, schedules, volunteers } from "@/lib/mock-data"

export async function GET() {
  return NextResponse.json({
    stats: dashboardStats,
    schedules,
    volunteers,
    currentTime: new Date().toISOString(),
  })
}
