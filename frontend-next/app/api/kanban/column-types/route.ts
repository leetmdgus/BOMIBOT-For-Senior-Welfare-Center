import { NextResponse } from "next/server"

import { getColumnTypes } from "@/services/kanban.board.mock.service"

export async function GET() {
  const columnTypes = await getColumnTypes()

  return NextResponse.json(columnTypes)
}
