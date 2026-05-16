"use client"

import Link from "next/link"
import { useMemo, useRef } from "react"
import { ArrowLeft, Copy, QrCode } from "lucide-react"
import QRCode from "react-qr-code"

import { Button } from "@/components/ui/button"

export function SurveyHeader({ id }: { id: string }) {
  const qrRef = useRef<HTMLDivElement>(null)

  const surveyUrl = useMemo(() => {
    if (typeof window === "undefined") return ""

    const returnTo = encodeURIComponent(
      `${window.location.origin}/task/${id}/survey?view=results`,
    )

    return `${window.location.origin}/survey/${id}?returnTo=${returnTo}`
  }, [id])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl)
      alert("설문 링크가 복사되었습니다.")
    } catch {
      alert("링크 복사에 실패했습니다.")
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
        <Link href={`/task/${id}/survey`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>

        <h1 className="text-xl font-bold text-foreground">만족도조사</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-2" onClick={handleCopy}>
          <Copy className="size-4" />
          링크 복사
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