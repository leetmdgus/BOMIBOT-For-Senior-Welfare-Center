"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Minimize2,
  Maximize2,
  FileText,
  BarChart3,
  Search,
  Clock,
  Plus,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const suggestions = [
  { icon: BarChart3, text: "2분기에 실적횟수가 가장 많은 사업은 뭐야?" },
  { icon: FileText, text: "사회 프로그램에 배정된 예산 중 남은 잔액이 있어?" },
  { icon: Search, text: "세대 통합 검여자 명단만 따로 추출해서 표로 만들어줘." },
  { icon: Clock, text: "현재 사업계획서의 기대효과 부분을 요약해줘." },
]

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "안녕하세요! 저는 봄이봇 AI 파트너입니다. 무엇을 도와드릴까요?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [attachedDoc, setAttachedDoc] = useState<string | null>("사회 단위사업계획서 (현재 페이지)")

  const handleSend = () => {
    if (!input.trim()) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput("")

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "네, 확인해보겠습니다. 잠시만 기다려주세요...",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
    }, 1000)
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg"
        size="icon"
      >
        <Sparkles className="size-6" />
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border bg-card shadow-2xl transition-all duration-300",
        isExpanded ? "h-[600px] w-[450px]" : "h-[500px] w-[380px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">봄이봇 AI 채팅</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "mb-4 flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="mt-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">SUGGESTIONS</p>
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(suggestion.text)}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted"
                >
                  <suggestion.icon className="size-4 text-muted-foreground" />
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attached Document */}
      {attachedDoc && (
        <div className="border-t px-4 py-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-primary" />
              <span>{attachedDoc}</span>
            </div>
            <Button variant="ghost" size="icon" className="size-6" onClick={() => setAttachedDoc(null)}>
              <X className="size-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9 shrink-0">
            <Plus className="size-4" />
          </Button>
          <Input
            placeholder="AI로 무엇이든 시도해 보세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
          />
          <Button size="icon" className="size-9 shrink-0" onClick={handleSend} disabled={!input.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          봄이봇은 항상을 맞추지 못할 수 있습니다. 중요한 정보를 정말 확인하세요.
        </p>
      </div>
    </div>
  )
}
