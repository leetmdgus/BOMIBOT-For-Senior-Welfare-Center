import { NextResponse } from "next/server"
import { surveys } from "@/lib/mock-data"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  
  let filteredSurveys = surveys
  
  if (status && status !== "전체") {
    filteredSurveys = surveys.filter(s => s.status === status)
  }
  
  const stats = {
    total: surveys.length,
    inProgress: surveys.filter(s => s.status === "진행중").length,
    totalResponses: surveys.reduce((acc, s) => acc + s.responseCount, 0),
    avgSatisfaction: (surveys.filter(s => s.satisfaction > 0).reduce((acc, s) => acc + s.satisfaction, 0) / surveys.filter(s => s.satisfaction > 0).length).toFixed(1),
  }
  
  return NextResponse.json({
    surveys: filteredSurveys,
    stats,
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const newSurvey = {
    id: `survey${Date.now()}`,
    ...body,
    status: "대기",
    responseCount: 0,
    satisfaction: 0,
  }
  
  return NextResponse.json(newSurvey, { status: 201 })
}
