import { NextResponse } from "next/server"

import { getSurveyList } from "@/services/survey.mock.service"

export async function GET() {
  const surveys = await getSurveyList()
  return NextResponse.json(surveys)
}
