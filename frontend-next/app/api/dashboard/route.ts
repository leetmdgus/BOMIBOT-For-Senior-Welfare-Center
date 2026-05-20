import { NextResponse } from "next/server"

import { getDashboardOverview } from "@/services/dashboard.mock.service"
import { toDashboardOverviewDTO } from "@/services/dashboard.utils"

export async function GET() {
  const overview = await getDashboardOverview()

  return NextResponse.json(toDashboardOverviewDTO(overview))
}
