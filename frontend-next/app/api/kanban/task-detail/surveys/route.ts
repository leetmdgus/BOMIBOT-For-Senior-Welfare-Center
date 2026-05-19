import { NextResponse } from "next/server"

import { getSurveys } from "@/services/kanban.task-detail.mock.service"

export async function GET() {
  const surveys = await getSurveys()

  return NextResponse.json(surveys)
}
