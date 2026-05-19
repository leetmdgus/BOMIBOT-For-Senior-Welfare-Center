import { NextResponse } from "next/server"

import { completeBusinessEvaluation } from "@/services/kanban.task-detail.mock.service"

export async function POST(request: Request) {
  const body = (await request.json()) as { taskId?: string }
  const taskId = body.taskId ?? "default"

  const evaluation = await completeBusinessEvaluation(taskId)
  return NextResponse.json(evaluation)
}
