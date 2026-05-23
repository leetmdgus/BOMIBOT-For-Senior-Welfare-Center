import { NextRequest, NextResponse } from "next/server"

import { getBusinessEvaluationTemplate } from "@/services/kanban.task-detail.mock.service"

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId") ?? "default"
  const template = await getBusinessEvaluationTemplate(taskId)
  return NextResponse.json(template)
}
