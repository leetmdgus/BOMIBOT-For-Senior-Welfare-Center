import { NextResponse } from "next/server"

import { getPerformanceRows } from "@/services/kanban.performance.mock.service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId") ?? undefined
  const month = searchParams.get("month") ?? undefined
  const scope = searchParams.get("scope")

  if (scope === "input-management") {
    const { getInputManagementRows } = await import(
      "@/services/kanban.performance.mock.service"
    )
    const data = await getInputManagementRows()

    return NextResponse.json({ data })
  }

  if (scope === "input-meta") {
    const { getPerformanceInputMeta } = await import(
      "@/services/kanban.performance.mock.service"
    )
    const meta = await getPerformanceInputMeta()
    return NextResponse.json(meta)
  }

  const result = await getPerformanceRows({ projectId, month })

  return NextResponse.json(result)
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
