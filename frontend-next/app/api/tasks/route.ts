import { NextResponse } from "next/server"

import { getProjects } from "@/services/kanban.board.mock.service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const categoryId = searchParams.get("categoryId")
  const year = searchParams.get("year") ?? new Date().getFullYear().toString()

  const projects = await getProjects(year)

  if (projectId) {
    const project = projects.find((item) => item.id === projectId)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (categoryId) {
      const category = project.categories.find((item) => item.id === categoryId)

      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }

      return NextResponse.json({
        projectId,
        categoryId,
        tasks: category.tasks,
      })
    }

    return NextResponse.json({
      projectId,
      categories: project.categories,
    })
  }

  const allTasks = projects.flatMap((project) =>
    project.categories.flatMap((category) =>
      category.tasks.map((task) => ({
        ...task,
        projectId: project.id,
        projectName: project.title,
        categoryId: category.id,
        categoryTitle: category.title,
      }))
    )
  )

  return NextResponse.json({ tasks: allTasks })
}

export async function POST(request: Request) {
  const body = await request.json()

  const newTask = {
    id: `task${Date.now()}`,
    ...body,
    completedCount: 0,
    totalCount: body.totalCount || 10,
  }

  return NextResponse.json(newTask, { status: 201 })
}

export async function PUT(request: Request) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: "Task ID required" }, { status: 400 })
  }

  return NextResponse.json({ id, ...updates })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Task ID required" }, { status: 400 })
  }

  return NextResponse.json({ success: true, deletedId: id })
}
