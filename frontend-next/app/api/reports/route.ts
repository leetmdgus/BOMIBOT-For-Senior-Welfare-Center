import { NextResponse } from "next/server"

import { getKanbanDocuments } from "@/services/kanban.documents.mock.service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  const documents = await getKanbanDocuments()

  if (type === "performance") {
    return NextResponse.json({ performanceRows: documents.performanceRows })
  }

  if (type === "budget") {
    return NextResponse.json({ budgetRows: documents.budgetRows })
  }

  if (type === "business-plan" || type === "businessPlan") {
    return NextResponse.json({ businessPlan: documents.businessPlan })
  }

  return NextResponse.json(documents)
}
