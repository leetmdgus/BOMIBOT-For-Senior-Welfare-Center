import { NextRequest, NextResponse } from "next/server"

import {
  getBusinessPlan,
  saveBusinessPlan,
} from "@/services/kanban.task-detail.mock.service"
import type { SaveBusinessPlanPayload } from "@/services/kanban.task-detail.types"

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId")

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 })
  }

  const document = await getBusinessPlan(taskId)
  return NextResponse.json(document)
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveBusinessPlanPayload & {
      taskId?: string
    }
    const taskId = body.taskId

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 })
    }

    const { taskId: _ignored, ...payload } = body
    const document = await saveBusinessPlan(taskId, payload)
    return NextResponse.json(document)
  } catch (error) {
    console.error("사업계획서 저장 실패:", error)
    return NextResponse.json(
      { error: "Failed to save business plan" },
      { status: 500 },
    )
  }
}
