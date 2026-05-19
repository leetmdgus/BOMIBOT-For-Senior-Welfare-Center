import { NextResponse } from "next/server"

import { getEbooks } from "@/services/ebooks.mock.service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") ?? undefined
  const search = searchParams.get("search") ?? undefined

  const result = await getEbooks({ category, search })

  return NextResponse.json(result)
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
