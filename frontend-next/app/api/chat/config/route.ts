import { NextResponse } from "next/server"

import { getChatAppConfig } from "@/services/chat.server.service"

export async function GET() {
  const config = await getChatAppConfig()
  return NextResponse.json(config)
}
