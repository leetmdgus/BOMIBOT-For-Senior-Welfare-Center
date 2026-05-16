import { NextResponse } from "next/server"
import { ebooks } from "@/lib/mock-data"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const search = searchParams.get("search")
  
  let filteredEbooks = ebooks
  
  if (category && category !== "전체") {
    filteredEbooks = filteredEbooks.filter(e => e.tag === category)
  }
  
  if (search) {
    const searchLower = search.toLowerCase()
    filteredEbooks = filteredEbooks.filter(e => 
      e.title.toLowerCase().includes(searchLower) ||
      e.team.toLowerCase().includes(searchLower)
    )
  }
  
  const categories = ["전체", ...new Set(ebooks.map(e => e.tag))]
  
  return NextResponse.json({
    ebooks: filteredEbooks,
    categories,
    total: filteredEbooks.length,
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const newEbook = {
    id: `ebook${Date.now()}`,
    ...body,
    thumbnail: "/placeholder.svg",
    createdAt: new Date().toISOString().split("T")[0],
  }
  
  return NextResponse.json(newEbook, { status: 201 })
}
