import { NextResponse } from "next/server"

import { getSurveyResults } from "@/services/survey.mock.service"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const results = await getSurveyResults(id)
  return NextResponse.json(results)
}
