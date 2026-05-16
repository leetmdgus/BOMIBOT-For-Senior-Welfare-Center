import { NextResponse } from "next/server"
import { performanceReports, budgetReports, businessPlanReports } from "@/lib/mock-data"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const year = searchParams.get("year")
  const period = searchParams.get("period")
  
  switch (type) {
    case "performance":
      return NextResponse.json({
        type: "performance",
        year: year || "2026",
        period: period || "월간",
        data: performanceReports,
      })
    
    case "budget":
      return NextResponse.json({
        type: "budget",
        year: year || "2026",
        data: budgetReports,
        summary: {
          total2026: 6867906003,
          total2025: 0,
          totalIncome: 700310188,
          totalSubsidy: 5901551500,
          totalDonation: 260784315,
          totalTransfer: 4600000,
          totalMisc: 660000,
          grandTotal: 6867906003,
        },
      })
    
    case "businessPlan":
      return NextResponse.json({
        type: "businessPlan",
        year: year || "2026",
        data: businessPlanReports,
      })
    
    default:
      return NextResponse.json({
        performance: performanceReports,
        budget: budgetReports,
        businessPlan: businessPlanReports,
      })
  }
}
