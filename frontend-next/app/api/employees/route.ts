import { departments, employees } from "@/lib/mocks/kanban.board.mock"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const department = searchParams.get("department")
  const search = searchParams.get("search")
  
  let filteredEmployees = employees
  
  if (department && department !== "전체") {
    filteredEmployees = filteredEmployees.filter(e => e.department === department)
  }
  
  if (search) {
    const searchLower = search.toLowerCase()
    filteredEmployees = filteredEmployees.filter(e => 
      e.name.toLowerCase().includes(searchLower) ||
      e.role.toLowerCase().includes(searchLower) ||
      e.department.toLowerCase().includes(searchLower)
    )
  }
  
  return NextResponse.json({
    employees: filteredEmployees,
    departments,
  })
}
