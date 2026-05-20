import { NextResponse } from "next/server"

import { askAssistantQuestionServer } from "@/services/chat.server.service"
import type { AssistantQuestionRequest } from "@/services/chat.types"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AssistantQuestionRequest
    const message = body.message?.trim()

    if (!message) {
      return NextResponse.json(
        { error: "질문 내용이 필요합니다." },
        { status: 400 },
      )
    }

    const result = await askAssistantQuestionServer(message)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[chat/assistant]", error)
    const detail =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : undefined
    return NextResponse.json(
      { error: detail ?? "답변 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}
