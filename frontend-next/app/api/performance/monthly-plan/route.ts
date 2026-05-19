import { NextRequest, NextResponse } from "next/server"

import { getMonthlyPlan } from "@/services/kanban.performance.mock.service"
import type { MonthlyPlanVersion } from "@/services/kanban.performance.types"

export async function GET(request: NextRequest) {
  const version = (request.nextUrl.searchParams.get("version") ??
    "기본계획") as MonthlyPlanVersion

  const plan = await getMonthlyPlan(version)
  return NextResponse.json(plan)
}
