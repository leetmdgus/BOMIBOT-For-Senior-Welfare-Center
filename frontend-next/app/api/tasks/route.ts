import { NextResponse } from "next/server"
import { projects } from "@/lib/mock-data"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const category = searchParams.get("category")
  
  if (projectId) {
    const project = projects.find(p => p.id === projectId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    
    if (category && project.tasks[category as keyof typeof project.tasks]) {
      return NextResponse.json({
        projectId,
        category,
        tasks: project.tasks[category as keyof typeof project.tasks],
      })
    }
    
    return NextResponse.json({
      projectId,
      tasks: project.tasks,
    })
  }
  
  // Return all tasks from all projects
  const allTasks = projects.flatMap(p => 
    Object.entries(p.tasks).flatMap(([cat, tasks]) => 
      tasks.map(t => ({ ...t, projectId: p.id, projectName: p.subName, category: cat }))
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
  
  // In a real app, this would update the database
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
