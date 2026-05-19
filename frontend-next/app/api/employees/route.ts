import { NextResponse } from "next/server"

import { searchEmployees } from "@/services/organization.mock.service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search") ?? undefined
  const department = searchParams.get("department") ?? undefined

  const result = await searchEmployees({ search, department })

  return NextResponse.json(result)
}
