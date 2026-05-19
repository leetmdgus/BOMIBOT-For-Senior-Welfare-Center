import { NextResponse } from "next/server"

import { getSuggestedQuestions } from "@/services/ebooks.mock.service"

export async function GET() {
  const suggestedQuestions = await getSuggestedQuestions()

  return NextResponse.json(suggestedQuestions)
}
