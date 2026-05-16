import { NextResponse } from "next/server"
import { projects } from "@/lib/mock-data"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year")
  
  let filteredProjects = projects
  
  if (year) {
    filteredProjects = projects.filter(p => p.year === parseInt(year))
  }
  
  return NextResponse.json(filteredProjects)
}

export async function POST(request: Request) {
  const body = await request.json()
  
  // In a real app, this would save to a database
  const newProject = {
    id: `proj${Date.now()}`,
    ...body,
    year: 2026,
    status: "진행중",
  }
  
  return NextResponse.json(newProject, { status: 201 })
}
