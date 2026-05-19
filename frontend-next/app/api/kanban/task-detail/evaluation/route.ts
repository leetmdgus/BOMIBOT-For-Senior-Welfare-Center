import { NextResponse } from "next/server"

import {
  getBusinessEvaluation,
  saveBusinessEvaluation,
} from "@/services/kanban.task-detail.mock.service"
import type { SaveBusinessEvaluationPayload } from "@/services/kanban.task-detail.types"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get("taskId") ?? "default"

  const evaluation = await getBusinessEvaluation(taskId)
  return NextResponse.json(evaluation)
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as SaveBusinessEvaluationPayload & {
    taskId?: string
  }
  const taskId = body.taskId ?? "default"
  const { taskId: _ignored, ...payload } = body

  const evaluation = await saveBusinessEvaluation(taskId, payload)
  return NextResponse.json(evaluation)
}
