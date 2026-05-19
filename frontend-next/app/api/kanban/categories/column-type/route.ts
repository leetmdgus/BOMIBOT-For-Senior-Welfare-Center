import { NextResponse } from "next/server"

import { getColumnTypeByCategoryTitle } from "@/services/kanban.board.mock.service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get("title")

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const columnType = await getColumnTypeByCategoryTitle(title)

  return NextResponse.json(columnType)
}
