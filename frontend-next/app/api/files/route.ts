import { NextResponse } from "next/server"

import { getFilesList } from "@/services/files.mock.service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get("folder") ?? undefined
  const type = searchParams.get("type") ?? undefined
  const search = searchParams.get("search") ?? undefined

  const result = await getFilesList({ folder, type, search })

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const newFile = {
    id: `file${Date.now()}`,
    ...body,
    modifiedAt: new Date().toISOString().split("T")[0],
  }
  
  return NextResponse.json(newFile, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  
  if (!id) {
    return NextResponse.json({ error: "File ID required" }, { status: 400 })
  }
  
  // In a real app, this would delete from database
  return NextResponse.json({ success: true, deletedId: id })
}
