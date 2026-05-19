import { NextResponse } from "next/server"

import { getEvaluationFiles } from "@/services/kanban.task-detail.mock.service"

export async function GET() {
  const files = await getEvaluationFiles()

  return NextResponse.json(files)
}
