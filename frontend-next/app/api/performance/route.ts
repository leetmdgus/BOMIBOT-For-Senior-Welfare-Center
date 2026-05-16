import { NextResponse } from "next/server"
import { subProjects } from "@/lib/mock-data"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const month = searchParams.get("month")
  
  let filteredData = subProjects
  
  if (projectId) {
    filteredData = filteredData.filter(s => s.projectId === projectId)
  }
  
  if (month) {
    filteredData = filteredData.filter(s => s.month === month)
  }
  
  // Calculate totals
  const totals = {
    planPeople: filteredData.reduce((acc, s) => acc + s.planPeople, 0),
    planCount: filteredData.reduce((acc, s) => acc + s.planCount, 0),
    planBudget: filteredData.reduce((acc, s) => acc + s.planBudget, 0),
    actualPeople: filteredData.reduce((acc, s) => acc + s.actualPeople, 0),
    actualCount: filteredData.reduce((acc, s) => acc + s.actualCount, 0),
  }
  
  return NextResponse.json({
    data: filteredData,
    totals,
    count: filteredData.length,
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const newRecord = {
    id: `sub${Date.now()}`,
    ...body,
  }
  
  return NextResponse.json(newRecord, { status: 201 })
}

export async function PUT(request: Request) {
  const body = await request.json()
  const { id, ...updates } = body
  
  if (!id) {
    return NextResponse.json({ error: "Record ID required" }, { status: 400 })
  }
  
  // In a real app, this would update the database
  return NextResponse.json({ id, ...updates })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  
  if (!id) {
    return NextResponse.json({ error: "Record ID required" }, { status: 400 })
  }
  
  return NextResponse.json({ success: true, deletedId: id })
}
