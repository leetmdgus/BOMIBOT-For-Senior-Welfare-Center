import { files } from "@/lib/mocks/kanban.board.mock"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get("folder")
  const type = searchParams.get("type")
  const search = searchParams.get("search")
  
  let filteredFiles = files
  
  if (folder && folder !== "전체") {
    filteredFiles = filteredFiles.filter(f => f.folder === folder)
  }
  
  if (type && type !== "전체") {
    filteredFiles = filteredFiles.filter(f => f.type === type)
  }
  
  if (search) {
    const searchLower = search.toLowerCase()
    filteredFiles = filteredFiles.filter(f => 
      f.name.toLowerCase().includes(searchLower)
    )
  }
  
  const folders = [...new Set(files.map(f => f.folder))]
  const storageUsed = files.reduce((acc, f) => {
    const size = parseFloat(f.size)
    const unit = f.size.includes("MB") ? 1 : f.size.includes("GB") ? 1024 : 0.001
    return acc + size * unit
  }, 0)
  
  return NextResponse.json({
    files: filteredFiles,
    folders,
    storage: {
      used: storageUsed.toFixed(1),
      total: 1000,
      unit: "MB",
    },
  })
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
