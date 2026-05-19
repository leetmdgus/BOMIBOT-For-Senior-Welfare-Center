import { NextResponse } from "next/server"

import { createTask } from "@/services/kanban.board.mock.service"
import type { Task } from "@/services/kanban.board.types"

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; categoryId: string }>
  }
) {
  const { projectId, categoryId } = await params
  const body = (await request.json()) as Omit<Task, "id">
  const task = await createTask(projectId, categoryId, body)

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json(task, { status: 201 })
}
