import { NextRequest, NextResponse } from "next/server"

import {
  getSurveyDetail,
  saveSurvey,
} from "@/services/survey.mock.service"
import type { SaveSurveyPayload } from "@/services/survey.types"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const detail = await getSurveyDetail(id)
  return NextResponse.json(detail)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const payload = (await request.json()) as SaveSurveyPayload
  const result = await saveSurvey(id, payload)
  return NextResponse.json(result)
}
