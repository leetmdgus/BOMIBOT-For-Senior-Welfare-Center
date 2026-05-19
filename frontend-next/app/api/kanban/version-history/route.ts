import { NextRequest, NextResponse } from "next/server"

import { getVersionHistory } from "@/services/kanban.version-history.mock.service"
import type { VersionHistoryActionType } from "@/services/kanban.version-history.types"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const actionType = searchParams.get("actionType") as
    | VersionHistoryActionType
    | "all"
    | null

  const histories = await getVersionHistory({
    year: searchParams.get("year") ?? undefined,
    actionType: actionType ?? "all",
    query: searchParams.get("query") ?? undefined,
  })

  return NextResponse.json(histories)
}
