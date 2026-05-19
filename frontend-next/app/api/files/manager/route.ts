import { NextResponse } from "next/server"

import { getFileManagerState } from "@/services/files.mock.service"

export async function GET() {
  const state = await getFileManagerState()

  return NextResponse.json(state)
}
