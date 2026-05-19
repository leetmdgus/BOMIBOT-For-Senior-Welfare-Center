import { NextResponse } from "next/server"

import { getTaskPathMap } from "@/services/kanban.board.mock.service"

export async function GET() {
  const taskPathMap = await getTaskPathMap()

  return NextResponse.json(taskPathMap)
}
