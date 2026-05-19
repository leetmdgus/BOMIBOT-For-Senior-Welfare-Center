import { NextResponse } from "next/server"

import { deleteTask } from "@/services/kanban.board.mock.service"

export async function DELETE(
  _request: Request,
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
  const deleted = await deleteTask(projectId, categoryId, taskId)

  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
