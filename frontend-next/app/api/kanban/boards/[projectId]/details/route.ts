import { NextResponse } from "next/server"

import { updateProject } from "@/services/kanban.board.mock.service"
import type { KanbanProject } from "@/services/kanban.board.types"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const body = (await request.json()) as Partial<KanbanProject>
  const project = await updateProject(projectId, body)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json(project)
}
