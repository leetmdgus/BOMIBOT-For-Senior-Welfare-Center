import { NextResponse } from "next/server"

import { getChatConfig } from "@/services/chat.mock.service"

export async function GET() {
  const config = await getChatConfig()
  return NextResponse.json(config)
}
