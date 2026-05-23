import { NextResponse } from "next/server"

import { getViewTogetherFixedFiles } from "@/services/kanban.task-detail.mock.service"

export async function GET() {
  const files = await getViewTogetherFixedFiles()
  return NextResponse.json(files)
}
