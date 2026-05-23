import { NextRequest, NextResponse } from "next/server"

import { getEvaluationFiles } from "@/services/kanban.task-detail.mock.service"

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId") ?? "default"
  const files = await getEvaluationFiles(taskId)
  return NextResponse.json(files)
}
