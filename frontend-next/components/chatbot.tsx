"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  AlertCircle,
  BarChart3,
  Clock,
  FileText,
  Film,
  Headphones,
  HelpCircle,
  ImagePlus,
  Loader2,
  Mail,
  Minimize2,
  Maximize2,
  Search,
  Send,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getChatConfig, submitCsTicket } from "@/services/chat.service"
import type { ChatMessageAttachment, ChatSuggestion } from "@/services/chat.types"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  attachments?: ChatMessageAttachment[]
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

export function Chatbot() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([])
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

  useEffect(() => {
    getChatConfig()
      .then((config) => {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: config.welcomeMessage,
            timestamp: new Date(),
          },
        ])
        setSuggestions(config.suggestions)
        setPlaceholderReply(config.placeholderReply)
        setInputPlaceholder(config.inputPlaceholder)
        setCsEmail(config.csEmail)
        setMaxAttachments(config.maxAttachments)
        setMaxMessageLength(config.maxMessageLength)
        setMaxImageSizeMb(config.maxImageSizeMb)
        setMaxVideoSizeMb(config.maxVideoSizeMb)
      })
      .catch((error) => {
        console.error("CS 챗봇 설정 로드 실패:", error)
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              "안녕하세요, 봄이봇 고객지원입니다. 이슈 내용과 스크린샷을 보내주시면 이메일로 답변드립니다.",
            timestamp: new Date(),
          },
        ])
      })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isOpen])

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

  const handleSend = async () => {
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

    setMessages((prev) => [...prev, userMessage])
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

      setMessages((prev) => [...prev, aiMessage])

      toast({
        title: "문의가 접수되었습니다",
        description: `${result.sentTo}로 메일이 발송되었습니다. (${result.ticketId})`,
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

  if (!isOpen) {
    return (
      <div className="fixed bottom-0 right-0 z-50 flex flex-col items-end p-4 pb-5 print:hidden">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-12 gap-2 rounded-full px-5 shadow-lg"
        >
          <Headphones className="size-5" />
          고객지원
        </Button>
        <p className="mt-1.5 pr-1 text-[10px] text-muted-foreground">
          이슈·사진·동영상 → 메일 접수
        </p>
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
      <div className="flex items-center justify-between border-b bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/15">
            <Headphones className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">고객지원 (CS)</h3>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Mail className="size-3" />
              {csEmail}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
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

        {messages.length === 1 && suggestions.length > 0 ? (
          <div className="pt-1">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              자주 묻는 문의
            </p>
            <div className="space-y-1.5">
              {suggestions.map((suggestion) => {
                const Icon = suggestionIcons[suggestion.icon]

                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => setInput(suggestion.text)}
                    className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
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

      {pendingFiles.length > 0 ? (
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
        <Input
          type="email"
          placeholder="회신 받을 이메일 (선택)"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          className="h-8 text-xs"
        />

        <div className="flex items-end gap-2">
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
          <div className="relative min-w-0 flex-1">
            <Textarea
              placeholder={inputPlaceholder}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
              maxLength={maxMessageLength}
              rows={isExpanded ? 5 : 3}
              className="min-h-[72px] max-h-[min(240px,35vh)] resize-y pb-6 pr-1 text-sm leading-relaxed"
              disabled={isSubmitting}
            />
            <p
              className={cn(
                "pointer-events-none absolute bottom-1.5 right-2 text-[10px] tabular-nums",
                input.length > maxMessageLength * 0.9
                  ? "text-destructive"
                  : "text-muted-foreground/80",
              )}
            >
              {input.length.toLocaleString()} / {maxMessageLength.toLocaleString()}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => void handleSend()}
            disabled={
              isSubmitting || (!input.trim() && pendingFiles.length === 0)
            }
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>

        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          문의·사진·동영상은 <span className="font-medium">{csEmail}</span>로 메일
          접수됩니다. 이미지 {maxImageSizeMb}MB·동영상 {maxVideoSizeMb}MB 이하,
          첨부 최대 {maxAttachments}개.
        </p>
      </div>
    </div>
  )
}
