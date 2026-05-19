import { NextResponse } from "next/server"

import { getStaffList } from "@/services/kanban.board.mock.service"

export async function GET() {
  const staff = await getStaffList()

  return NextResponse.json(staff)
}
