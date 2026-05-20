import { NextResponse } from "next/server"

import { submitCsTicketServer } from "@/services/chat.server.service"
import type { CsTicketRequest } from "@/services/chat.types"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CsTicketRequest

    if (!body.message?.trim() && (!body.attachments || body.attachments.length === 0)) {
      return NextResponse.json(
        { error: "문의 내용 또는 첨부 파일이 필요합니다." },
        { status: 400 },
      )
    }

    const result = await submitCsTicketServer({
      message: body.message?.trim() ?? "",
      attachments: body.attachments ?? [],
      pageUrl: body.pageUrl,
      contactEmail: body.contactEmail,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("CS 티켓 접수 실패:", error)
    const message =
      error instanceof Error ? error.message : "문의 접수에 실패했습니다."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
