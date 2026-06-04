"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import QRCode from "react-qr-code"
import {
  Calendar,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  TrendingUp,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { getClientSession } from "@/lib/auth/session"
import { cn } from "@/lib/utils"
import { statusStyles } from "./data"
import { getSurveyList } from "@/services/survey.service"
import type { Survey } from "@/services/kanban.task-detail.types"
import type { SurveyListItem } from "@/services/survey.types"

function toKanbanSurvey(item: SurveyListItem): Survey {
  return {
    id: item.id,
    title: item.title,
    program: item.program,
    date: item.date,
    status: item.status,
    endDate: item.endDate,
  }
}

export function SatisfactionSurveyTab() {
  const params = useParams()
  const pathname = usePathname()
  const taskId = typeof params.id === "string" ? params.id : ""
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    responses: 0,
    satisfaction: 0,
  })

  const loadSurveys = useCallback(async () => {
    if (!taskId) {
      setSurveys([])
      setStats({ total: 0, active: 0, responses: 0, satisfaction: 0 })
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const list = await getSurveyList({ taskId })
      const rows = list.map(toKanbanSurvey)
      setSurveys(rows)

      const active = list.filter((item) => item.status === "진행중").length
      const responses = list.reduce(
        (sum, item) => sum + (item.responseCount ?? 0),
        0,
      )
      const rated = list.filter((item) => (item.satisfaction ?? 0) > 0)
      const satisfaction =
        rated.length > 0
          ? rated.reduce((sum, item) => sum + (item.satisfaction ?? 0), 0) /
            rated.length
          : 0

      setStats({
        total: list.length,
        active,
        responses,
        satisfaction,
      })
    } catch (error) {
      console.error("설문 데이터 로드 실패:", error)
      setSurveys([])
      setStats({ total: 0, active: 0, responses: 0, satisfaction: 0 })
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    void loadSurveys()
  }, [loadSurveys, pathname])

  useEffect(() => {
    const onFocus = () => {
      void loadSurveys()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [loadSurveys])

  const surveyHref = (surveyId: string, query?: string) => {
    const base = `/survey/${surveyId}`
    const params = new URLSearchParams()
    if (taskId) params.set("taskId", taskId)
    if (query) {
      const extra = new URLSearchParams(query)
      extra.forEach((value, key) => params.set(key, value))
    }
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }

  // 공개(QR) 응답 URL — 비로그인 응답이 가능하도록 지역을 포함
  const regionId = getClientSession()?.regionId ?? undefined
  const [qrSurvey, setQrSurvey] = useState<Survey | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  const respondUrlFor = (surveyId: string) => {
    if (typeof window === "undefined") return ""
    const suffix = regionId ? `?region=${encodeURIComponent(regionId)}` : ""
    return `${window.location.origin}/survey/${surveyId}/respond${suffix}`
  }

  const handleCopyRespondLink = async (surveyId: string) => {
    const url = respondUrlFor(surveyId)
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      alert("응답 링크가 복사되었습니다.")
    } catch {
      alert("복사에 실패했습니다.")
    }
  }

  const handleDownloadQrPng = () => {
    const svg = qrRef.current?.querySelector("svg")
    if (!svg || !qrSurvey) return
    const xml = new XMLSerializer().serializeToString(svg)
    const svg64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`
    const img = new Image()
    img.onload = () => {
      const size = 1024
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `survey-${qrSurvey.id}-qr.png`
      link.click()
    }
    img.src = svg64
  }

  const handleCopyQrImage = () => {
    const svg = qrRef.current?.querySelector("svg")
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const svg64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`
    const img = new Image()
    img.onload = () => {
      const size = 1024
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      canvas.toBlob(async (blob) => {
        if (!blob) return
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ])
          alert("QR 이미지가 복사되었습니다.")
        } catch {
          alert("이미지 복사를 지원하지 않는 브라우저입니다. PNG 저장을 이용해 주세요.")
        }
      }, "image/png")
    }
    img.src = svg64
  }

  const qrUrl = qrSurvey ? respondUrlFor(qrSurvey.id) : ""

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">만족도조사</h1>

        <Link
          href={
            taskId
              ? `/survey/new?view=edit&taskId=${encodeURIComponent(taskId)}`
              : "/survey/new?view=edit"
          }
        >
          <Button className="gap-2">
            <Plus className="size-4" />
            설문 만들기
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard
          icon={<FileText className="size-4" />}
          label="총 설문"
          value={`${stats.total}개`}
        />
        <StatCard
          icon={<TrendingUp className="size-4 text-primary" />}
          label="진행중"
          value={`${stats.active}개`}
        />
        <StatCard
          icon={<Users className="size-4 text-amber-500" />}
          label="총 응답"
          value={`${stats.responses}명`}
        />
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="설문명, 프로그램명 검색..." className="pl-10" />
        </div>

        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="size-4" />
          전체
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            설문 목록을 불러오는 중…
          </p>
        ) : surveys.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            등록된 설문이 없습니다. 「설문 만들기」로 첫 설문을 추가해 보세요.
          </p>
        ) : (
          surveys.map((survey) => (
            <div
              key={survey.id}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <Link href={surveyHref(survey.id, "view=edit")} className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium transition-colors hover:text-primary">
                    {survey.title}
                  </span>

                  <Badge className={cn("text-xs", statusStyles[survey.status])}>
                    {survey.status}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {survey.program}
                  {survey.date && ` · ${survey.date}`}
                </p>
              </Link>

              <div className="flex items-center gap-3">
                <Link href={surveyHref(survey.id, "view=edit")}>
                  <Button size="sm">수정하기</Button>
                </Link>
                <Link href={surveyHref(survey.id, "view=results")}>
                  <Button variant="outline" size="sm">
                    결과 보기
                  </Button>
                </Link>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="size-4" />
                  {survey.endDate}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={surveyHref(survey.id, "view=preview")}>
                        <Eye className="mr-2 size-4" />
                        미리 보기
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={surveyHref(survey.id, "view=edit")}>
                        편집
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void handleCopyRespondLink(survey.id)}
                    >
                      <Copy className="mr-2 size-4" />
                      응답 링크 복사
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setQrSurvey(survey)}>
                      <QrCode className="mr-2 size-4" />
                      QR 코드
                    </DropdownMenuItem>
                    <DropdownMenuItem>설문 중지</DropdownMenuItem>
                    <DropdownMenuItem>설문 복사</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={qrSurvey !== null} onOpenChange={(open) => !open && setQrSurvey(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="truncate">
              {qrSurvey?.title ?? "설문"} · 응답 QR
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-1">
            <div ref={qrRef} className="rounded-lg bg-white p-4 shadow-sm">
              {qrUrl ? <QRCode value={qrUrl} size={232} /> : null}
            </div>
            <p className="w-full break-all text-center text-xs text-muted-foreground">
              {qrUrl}
            </p>
            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyQrImage}
                  disabled={!qrUrl}
                >
                  <Copy className="mr-2 size-4" />
                  QR 복사
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownloadQrPng}
                  disabled={!qrUrl}
                >
                  <Download className="mr-2 size-4" />
                  PNG 저장
                </Button>
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={!qrUrl}
                onClick={() =>
                  qrUrl && window.open(qrUrl, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink className="mr-2 size-4" />
                응답 화면 열기
              </Button>
            </div>
            {!regionId ? (
              <p className="text-center text-[11px] text-amber-600">
                지역 정보가 없어 QR에 지역이 포함되지 않았습니다. 로그인 후 다시 시도하세요.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
