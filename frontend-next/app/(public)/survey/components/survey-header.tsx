"use client"

import Link from "next/link"
import { useMemo, useRef } from "react"
import { ArrowLeft, Copy, QrCode } from "lucide-react"
import QRCode from "react-qr-code"

import { Button } from "@/components/ui/button"
import { getClientSession } from "@/lib/auth/session"

export function SurveyHeader({
  id,
  title,
}: {
  id: string
  title?: string
}) {
  const qrRef = useRef<HTMLDivElement>(null)

  // 응답자에게 공유하는 링크 — 로그인 없이 들어갈 수 있는 공개 응답 페이지로.
  // region이 있으면 포함하고, 없어도 by-id 공개 조회로 응답 가능.
  const surveyUrl = useMemo(() => {
    if (typeof window === "undefined") return ""

    const regionId = getClientSession()?.regionId
    const suffix = regionId ? `?region=${encodeURIComponent(regionId)}` : ""

    return `${window.location.origin}/survey/${id}/respond${suffix}`
  }, [id])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl)
      alert("설문 링크가 복사되었습니다.")
    } catch {
      alert("설문 링크 복사에 실패했습니다.")
    }
  }

  const handleDownloadQR = async () => {
    const svg = qrRef.current?.querySelector("svg")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      canvas.width = 300
      canvas.height = 300
      ctx?.drawImage(img, 22, 22, 256, 256)

      const pngFile = canvas.toDataURL("image/png")
      const link = document.createElement("a")

      link.download = `survey-${id}-qr.png`
      link.href = pngFile
      link.click()
    }

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href={`/kanban/task/${id}/survey`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>

        <h1 className="text-xl font-bold text-foreground">
          {title || "만족도조사"}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-2" onClick={handleCopy}>
          <Copy className="size-4" />
          설문 링크 복사
        </Button>

        <Button variant="outline" className="gap-2" onClick={handleDownloadQR}>
          <QrCode className="size-4" />
          QR 다운로드
        </Button>

        <Button variant="outline">목록</Button>
      </div>

      <div className="hidden">
        <div ref={qrRef} className="bg-white p-4">
          <QRCode value={surveyUrl} size={256} />
        </div>
      </div>
    </div>
  )
}