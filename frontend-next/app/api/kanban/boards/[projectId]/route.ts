import { NextResponse } from "next/server"

import { deleteProject } from "@/services/kanban.board.mock.service"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const deleted = await deleteProject(projectId)

  if (!deleted) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
