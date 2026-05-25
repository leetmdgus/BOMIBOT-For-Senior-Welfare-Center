"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  AlertCircle,
  BarChart3,
  Clock,
  FileText,
  Film,
  Bot,
  Headphones,
  HelpCircle,
  ImagePlus,
  Loader2,
  Mail,
  Minimize2,
  Maximize2,
  RotateCcw,
  Search,
  Send,
  X,
} from "lucide-react"

import { RagSourcesView } from "@/components/chatbot/rag-sources-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  askAssistantQuestion,
  getChatConfig,
  submitCsTicket,
} from "@/services/chat.service"
import type {
  AssistantConfig,
  AssistantRagCitation,
  ChatMessageAttachment,
  ChatPanelMode,
  ChatSuggestion,
} from "@/services/chat.types"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  attachments?: ChatMessageAttachment[]
  sources?: string[]
  ragCitations?: AssistantRagCitation[]
  timestamp: Date
}

interface PendingAttachment {
  id: string
  file: File
  previewUrl: string
}

const suggestionIcons = {
  barChart: BarChart3,
  fileText: FileText,
  search: Search,
  clock: Clock,
  alert: AlertCircle,
  help: HelpCircle,
} as const

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function isImageFile(file: File) {
  return file.type.startsWith("image/")
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/")
}

function isMediaFile(file: File) {
  return isImageFile(file) || isVideoFile(file)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function CsAttachmentPreview({
  previewUrl,
  name,
  type,
  size = "md",
}: {
  previewUrl: string
  name: string
  type: string
  size?: "sm" | "md"
}) {
  const boxClass = size === "sm" ? "size-14" : "size-20"
  const isVideo = type.startsWith("video/")

  if (isVideo) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-md border bg-black/80",
          boxClass,
        )}
      >
        <video
          src={previewUrl}
          className="size-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] text-white">
          <Film className="inline size-2.5" />
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border",
        boxClass,
      )}
    >
      <Image
        src={previewUrl}
        alt={name}
        fill
        unoptimized
        className="object-cover"
      />
    </div>
  )
}

const CS_ONLY_PATHS = ["/login", "/signup"]

export function Chatbot() {
  const { toast } = useToast()
  const pathname = usePathname()
  const csOnlyMode = CS_ONLY_PATHS.some((path) => pathname?.startsWith(path))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [mode, setMode] = useState<ChatPanelMode>(csOnlyMode ? "cs" : "assistant")
  const [csMessages, setCsMessages] = useState<Message[]>([])
  const [assistantMessages, setAssistantMessages] = useState<Message[]>([])
  const [csSuggestions, setCsSuggestions] = useState<ChatSuggestion[]>([])
  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig | null>(
    null,
  )
  const [assistantSuggestions, setAssistantSuggestions] = useState<
    ChatSuggestion[]
  >([])
  const [placeholderReply, setPlaceholderReply] = useState(
    "문의가 접수되었습니다. 담당자가 이메일로 연락드리겠습니다.",
  )
  const [inputPlaceholder, setInputPlaceholder] = useState("")
  const [csEmail, setCsEmail] = useState("bomi20260413@gmail.com")
  const [maxAttachments, setMaxAttachments] = useState(5)
  const [maxMessageLength, setMaxMessageLength] = useState(5000)
  const [maxImageSizeMb, setMaxImageSizeMb] = useState(10)
  const [maxVideoSizeMb, setMaxVideoSizeMb] = useState(100)
  const [input, setInput] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAssistantThinking, setIsAssistantThinking] = useState(false)
  const [csWelcomeMessage, setCsWelcomeMessage] = useState(
    "안녕하세요, 봄이봇 고객지원입니다. 이슈 내용과 스크린샷을 보내주시면 이메일로 답변드립니다.",
  )
  const [assistantWelcomeMessage, setAssistantWelcomeMessage] = useState(
    "안녕하세요! 사업 데이터를 바탕으로 질문에 답해 드립니다.",
  )

  const messages = mode === "cs" ? csMessages : assistantMessages
  const suggestions = mode === "cs" ? csSuggestions : assistantSuggestions
  const showQuickMenu = messages.length === 1 && suggestions.length > 0
  const canResetToQuickMenu = messages.length > 1

  useEffect(() => {
    if (csOnlyMode) {
      setMode("cs")
    }
  }, [csOnlyMode])

  useEffect(() => {
    getChatConfig()
      .then((config) => {
        setCsWelcomeMessage(config.cs.welcomeMessage)
        setAssistantWelcomeMessage(config.assistant.welcomeMessage)
        setCsMessages([
          {
            id: "cs-welcome",
            role: "assistant",
            content: config.cs.welcomeMessage,
            timestamp: new Date(),
          },
        ])
        setAssistantMessages([
          {
            id: "assistant-welcome",
            role: "assistant",
            content: config.assistant.welcomeMessage,
            timestamp: new Date(),
          },
        ])
        setCsSuggestions(config.cs.suggestions)
        setAssistantSuggestions(config.assistant.suggestions)
        setAssistantConfig(config.assistant)
        setPlaceholderReply(config.cs.placeholderReply)
        setInputPlaceholder(config.cs.inputPlaceholder)
        setCsEmail(config.cs.csEmail)
        setMaxAttachments(config.cs.maxAttachments)
        setMaxMessageLength(config.cs.maxMessageLength)
        setMaxImageSizeMb(config.cs.maxImageSizeMb)
        setMaxVideoSizeMb(config.cs.maxVideoSizeMb)
      })
      .catch((error) => {
        console.error("채팅 설정 로드 실패:", error)
        setCsMessages([
          {
            id: "cs-welcome",
            role: "assistant",
            content:
              "안녕하세요, 봄이봇 고객지원입니다. 이슈 내용과 스크린샷을 보내주시면 이메일로 답변드립니다.",
            timestamp: new Date(),
          },
        ])
        setAssistantMessages([
          {
            id: "assistant-welcome",
            role: "assistant",
            content:
              "안녕하세요! 사업 데이터를 바탕으로 질문에 답해 드립니다.",
            timestamp: new Date(),
          },
        ])
      })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isOpen, mode])

  useEffect(() => {
    return () => {
      pendingFiles.forEach((file) => URL.revokeObjectURL(file.previewUrl))
    }
  }, [pendingFiles])

  const handlePickMedia = () => {
    fileInputRef.current?.click()
  }

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    const mediaFiles = files.filter(isMediaFile)

    if (mediaFiles.length === 0) {
      toast({
        title: "이미지·동영상 파일만 첨부할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    const remaining = maxAttachments - pendingFiles.length

    if (remaining <= 0) {
      toast({
        title: `첨부는 최대 ${maxAttachments}개까지 가능합니다.`,
        variant: "destructive",
      })
      return
    }

    const accepted: PendingAttachment[] = []

    for (const file of mediaFiles) {
      if (accepted.length >= remaining) break

      const limitMb = isVideoFile(file) ? maxVideoSizeMb : maxImageSizeMb
      const limitBytes = limitMb * 1024 * 1024

      if (file.size > limitBytes) {
        toast({
          title: `${file.name} 용량 초과`,
          description: `${isVideoFile(file) ? "동영상" : "이미지"}는 ${limitMb}MB 이하만 첨부할 수 있습니다. (현재 ${formatFileSize(file.size)})`,
          variant: "destructive",
        })
        continue
      }

      accepted.push({
        id: `${Date.now()}-${file.name}-${accepted.length}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }

    if (accepted.length === 0) return

    setPendingFiles((prev) => [...prev, ...accepted])
    event.target.value = ""
  }

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  const sendAssistantMessage = async (
    text: string,
    options?: { appendUserMessage?: boolean },
  ) => {
    const trimmed = text.trim()
    if (!trimmed || isAssistantThinking) return

    const appendUser = options?.appendUserMessage !== false
    if (appendUser) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          content: trimmed,
          timestamp: new Date(),
        },
      ])
    }

    setIsAssistantThinking(true)

    try {
      const result = await askAssistantQuestion({
        message: trimmed,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      })

      setAssistantMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.answer,
          sources: result.sources,
          subgraph: result.subgraph,
          reasoningPaths: result.reasoningPaths,
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error("어시스턴트 응답 실패:", error)
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "데이터 조회에 실패했습니다. 잠시 후 다시 시도하거나 화면을 닫은 뒤 하단의 CS 문의 버튼으로 문의해 주세요.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsAssistantThinking(false)
    }
  }

  const handleAssistantSend = async () => {
    const text = input.trim()
    if (!text || isAssistantThinking) return
    setInput("")
    await sendAssistantMessage(text, { appendUserMessage: true })
  }

  const handleCsSend = async () => {
    const text = input.trim()
    if (!text && pendingFiles.length === 0) return
    if (text.length > maxMessageLength) {
      toast({
        title: "문의 내용이 너무 깁니다.",
        description: `최대 ${maxMessageLength.toLocaleString()}자까지 입력할 수 있습니다.`,
        variant: "destructive",
      })
      return
    }
    if (isSubmitting) return

    setIsSubmitting(true)

    const userAttachments: ChatMessageAttachment[] = pendingFiles.map(
      (item) => ({
        id: item.id,
        name: item.file.name,
        previewUrl: item.previewUrl,
        type: item.file.type,
      }),
    )

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text || "(첨부파일만 전송)",
      attachments: userAttachments,
      timestamp: new Date(),
    }

    setCsMessages((prev) => [...prev, userMessage])
    setInput("")

    try {
      const attachmentPayload = await Promise.all(
        pendingFiles.map(async (item) => ({
          name: item.file.name,
          type: item.file.type,
          dataUrl: await fileToDataUrl(item.file),
        })),
      )

      const result = await submitCsTicket({
        message: text,
        attachments: attachmentPayload,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        contactEmail: contactEmail.trim() || undefined,
      })

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `${result.message}\n\n${placeholderReply}`,
        timestamp: new Date(),
      }

      setCsMessages((prev) => [...prev, aiMessage])

      toast({
        title: result.emailSent ? "문의가 접수되었습니다" : "접수됨 (메일 미발송)",
        description: result.emailSent
          ? `${result.sentTo}로 메일이 발송되었습니다. (${result.ticketId})`
          : `${result.message} (${result.ticketId})`,
        variant: result.emailSent ? "default" : "destructive",
      })

      setPendingFiles((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl))
        return []
      })
    } catch (error) {
      console.error("CS 접수 실패:", error)
      toast({
        title: "접수에 실패했습니다",
        description: "잠시 후 다시 시도하거나 이메일로 문의해 주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSend = () => {
    if (mode === "cs") {
      void handleCsSend()
      return
    }
    void handleAssistantSend()
  }

  const runAssistantQuery = async (text: string) => {
    await sendAssistantMessage(text, { appendUserMessage: true })
  }

  const resetToQuickMenu = () => {
    if (mode === "cs") {
      setCsMessages([
        {
          id: "cs-welcome",
          role: "assistant",
          content: csWelcomeMessage,
          timestamp: new Date(),
        },
      ])
      setInput("")
      setContactEmail("")
      setPendingFiles((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl))
        return []
      })
      return
    }

    setAssistantMessages([
      {
        id: "assistant-welcome",
        role: "assistant",
        content: assistantWelcomeMessage,
        timestamp: new Date(),
      },
    ])
    setInput("")
    setIsAssistantThinking(false)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-0 right-0 z-50 flex flex-col items-end gap-2 p-4 pb-5 print:hidden">
        {!csOnlyMode ? (
          <Button
            onClick={() => {
              setMode("assistant")
              setIsOpen(true)
            }}
            className="h-11 gap-2 rounded-full px-4 shadow-lg"
          >
            <Bot className="size-5" />
            데이터 챗봇
          </Button>
        ) : null}
        <Button
          onClick={() => {
            setMode("cs")
            setIsOpen(true)
          }}
          variant={csOnlyMode ? "default" : "outline"}
          className={cn(
            "h-10 gap-2 rounded-full px-4 shadow-md",
            csOnlyMode && "h-11 shadow-lg",
          )}
        >
          <Headphones className="size-4" />
          CS 문의
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col rounded-2xl border bg-card shadow-2xl transition-all duration-300 print:hidden",
        isExpanded
          ? "h-[min(720px,90vh)] w-[440px]"
          : "h-[min(580px,85vh)] w-[400px]",
      )}
    >
      <div className="space-y-2 border-b bg-primary/5 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/15">
            {mode === "cs" ? (
              <Headphones className="size-4 text-primary" />
            ) : (
              <Bot className="size-4 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold leading-tight">
              {mode === "cs" ? "고객지원 (CS)" : "데이터 챗봇"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {mode === "cs" ? (
                <span className="flex items-center gap-1">
                  <Mail className="size-3" />
                  {csEmail}
                </span>
              ) : (
                "RAG 검색 + 실적·대시보드·칸반 데이터"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canResetToQuickMenu ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={resetToQuickMenu}
              disabled={isSubmitting || isAssistantThinking}
              title="퀵메뉴로 돌아가기"
              aria-label="퀵메뉴로 돌아가기"
            >
              <RotateCcw className="size-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="size-4" />
          </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[88%] rounded-2xl px-3 py-2.5",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              {mode === "assistant" &&
              message.role === "assistant" &&
              message.ragCitations &&
              message.ragCitations.length > 0 ? (
                <RagSourcesView
                  citations={message.ragCitations}
                  maxHeight={isExpanded ? 220 : 160}
                />
              ) : null}
              {message.sources && message.sources.length > 0 ? (
                <p className="mt-1.5 text-[10px] opacity-70">
                  출처: {message.sources.join(" · ")}
                </p>
              ) : null}
              {message.attachments && message.attachments.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.attachments.map((attachment) => {
                    const isVideo = attachment.type.startsWith("video/")

                    return (
                      <a
                        key={attachment.id}
                        href={attachment.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block shrink-0"
                        title={attachment.name}
                      >
                        {isVideo ? (
                          <video
                            src={attachment.previewUrl}
                            controls
                            playsInline
                            className="max-h-32 max-w-[200px] rounded-md border border-white/30 bg-black/80"
                          />
                        ) : (
                          <div className="relative size-16 overflow-hidden rounded-md border border-white/30">
                            <Image
                              src={attachment.previewUrl}
                              alt={attachment.name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                        )}
                      </a>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {isAssistantThinking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {assistantConfig?.thinkingLabel ?? "데이터를 조회하는 중…"}
          </div>
        ) : null}

        {showQuickMenu ? (
          <div className="pt-1">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {mode === "cs" ? "자주 묻는 문의" : "추천 질문"}
            </p>
            <div className="space-y-1.5">
              {suggestions.map((suggestion) => {
                const Icon = suggestionIcons[suggestion.icon]

                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => {
                      if (mode === "assistant") {
                        void runAssistantQuery(suggestion.text)
                        return
                      }
                      setInput(suggestion.text)
                    }}
                    disabled={isAssistantThinking}
                    className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span>{suggestion.text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {mode === "cs" && pendingFiles.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto border-t px-4 py-2">
          {pendingFiles.map((item) => (
            <div key={item.id} className="relative shrink-0">
              <CsAttachmentPreview
                previewUrl={item.previewUrl}
                name={item.file.name}
                type={item.file.type}
                size="sm"
              />
              <button
                type="button"
                onClick={() => removePendingFile(item.id)}
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2 border-t p-3">
        {mode === "cs" ? (
          <Input
            type="email"
            placeholder="회신 받을 이메일 (선택)"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            className="h-8 text-xs"
          />
        ) : null}

        <div className="flex items-end gap-2">
          {mode === "cs" ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFilesChange}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                onClick={handlePickMedia}
                disabled={pendingFiles.length >= maxAttachments}
                title="사진·동영상 첨부"
              >
                <ImagePlus className="size-4" />
              </Button>
            </>
          ) : null}
          <div className="relative min-w-0 flex-1">
            <Textarea
              placeholder={
                mode === "cs"
                  ? inputPlaceholder
                  : (assistantConfig?.inputPlaceholder ??
                    "데이터에 대해 질문해 보세요")
              }
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  handleSend()
                }
              }}
              maxLength={maxMessageLength}
              rows={isExpanded ? 5 : mode === "cs" ? 3 : 2}
              className={cn(
                "max-h-[min(240px,35vh)] resize-y text-sm leading-relaxed",
                mode === "cs"
                  ? "min-h-[72px] pb-6 pr-1"
                  : "min-h-[56px]",
              )}
              disabled={isSubmitting || isAssistantThinking}
            />
            {mode === "cs" ? (
              <p
                className={cn(
                  "pointer-events-none absolute bottom-1.5 right-2 text-[10px] tabular-nums",
                  input.length > maxMessageLength * 0.9
                    ? "text-destructive"
                    : "text-muted-foreground/80",
                )}
              >
                {input.length.toLocaleString()} /{" "}
                {maxMessageLength.toLocaleString()}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0"
            onClick={handleSend}
            disabled={
              mode === "cs"
                ? isSubmitting || (!input.trim() && pendingFiles.length === 0)
                : isAssistantThinking || !input.trim()
            }
          >
            {isSubmitting || isAssistantThinking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>

        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          {mode === "cs" ? (
            <>
              문의·사진·동영상은{" "}
              <span className="font-medium">{csEmail}</span>로 메일 접수됩니다.
              이미지 {maxImageSizeMb}MB·동영상 {maxVideoSizeMb}MB 이하, 첨부 최대{" "}
              {maxAttachments}개.
              {!csOnlyMode
                ? " 다른 문의는 창을 닫은 뒤 데이터 챗봇 버튼을 이용해 주세요."
                : " 로그인 후 데이터 챗봇을 이용할 수 있습니다."}
            </>
          ) : (
            <>
              온톨로지 지식 그래프와 연결된 목업 데이터로 답합니다. 「전체 요약」「5월 실적」처럼
              물어보세요. 고객지원은 창을 닫은 뒤 CS 문의 버튼을 눌러 주세요.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
