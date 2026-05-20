import { NextResponse } from "next/server"

import { getOntologyGraphPayload } from "@/services/chat.server.service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const question = searchParams.get("q")?.trim() ?? undefined
    const payload = await getOntologyGraphPayload(question)
    return NextResponse.json(payload)
  } catch (error) {
    console.error("[chat/ontology]", error)
    return NextResponse.json(
      { error: "지식 그래프를 불러오지 못했습니다." },
      { status: 500 },
    )
  }
}
