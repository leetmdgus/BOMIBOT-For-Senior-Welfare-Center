"use client"

import dynamic from "next/dynamic"

const Chatbot = dynamic(
  () => import("@common/components/chatbot/chatbot").then((mod) => mod.Chatbot),
  { ssr: false },
)

export function ChatbotClientLoader() {
  return <Chatbot />
}
