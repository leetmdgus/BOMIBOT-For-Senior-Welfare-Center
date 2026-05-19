import { NextResponse } from "next/server"

import {
  createProject,
  getProjects,
} from "@/services/kanban.board.mock.service"
import type { CreateProjectRequest } from "@/services/kanban.board.types"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year") ?? new Date().getFullYear().toString()

  const projects = await getProjects(year)

  return NextResponse.json(projects)
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateProjectRequest
  const project = await createProject(body)

  return NextResponse.json(project, { status: 201 })
}
