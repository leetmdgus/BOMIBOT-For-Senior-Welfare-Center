import { NextResponse } from "next/server"

import { getCategoryStyles } from "@/services/ebooks.mock.service"

export async function GET() {
  const categoryStyles = await getCategoryStyles()

  return NextResponse.json(categoryStyles)
}
