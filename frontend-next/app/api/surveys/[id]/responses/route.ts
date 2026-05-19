import { NextRequest, NextResponse } from "next/server"

import { submitSurveyResponse } from "@/services/survey.mock.service"
import type { SubmitSurveyResponsePayload } from "@/services/survey.types"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    const payload = (await request.json()) as SubmitSurveyResponsePayload

    if (!payload.answers?.length) {
      return NextResponse.json(
        { error: "answers are required" },
        { status: 400 }
      )
    }

    const result = await submitSurveyResponse(id, payload)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit response"

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
