import { NextResponse } from "next/server"

import { restoreVersionHistory } from "@/services/kanban.version-history.mock.service"

export async function POST(
  _request: Request,
  context: { params: Promise<{ historyId: string }> }
) {
  const { historyId } = await context.params
  const result = await restoreVersionHistory(historyId)

  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }

  return NextResponse.json(result)
}
