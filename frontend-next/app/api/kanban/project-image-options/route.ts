import { NextResponse } from "next/server"

import { getProjectImageOptions } from "@/services/kanban.board.mock.service"

export async function GET() {
  const options = await getProjectImageOptions()

  return NextResponse.json(options)
}
