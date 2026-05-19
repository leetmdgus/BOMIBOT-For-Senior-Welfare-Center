import { NextResponse } from "next/server"

import { updateTask } from "@/services/kanban.board.mock.service"
import type { Task } from "@/services/kanban.board.types"

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      projectId: string
      categoryId: string
      taskId: string
    }>
  }
) {
  const { projectId, categoryId, taskId } = await params
  const body = (await request.json()) as Partial<Task>
  const task = await updateTask(projectId, categoryId, taskId, body)

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json(task)
}
