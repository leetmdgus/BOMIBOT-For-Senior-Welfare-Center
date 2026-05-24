"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { getSurveyDetail } from "@/services/survey.service"
import type { SurveyDetail } from "@/services/survey.types"
import { BRAND_LOGO_SRC } from "@/lib/constants/brand"
import { SurveyResponseForm } from "./survey-response-form"

export function SurveyRespondPage({ id: idFromProps }: { id?: string }) {
  const routeParams = useParams()
  const routeId = routeParams?.id
  const id =
    idFromProps ??
    (typeof routeId === "string" ? routeId : Array.isArray(routeId) ? routeId[0] : "")

  const [detail, setDetail] = useState<SurveyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const data = await getSurveyDetail(id)
        if (!cancelled) setDetail(data)
      } catch (error) {
        console.error("설문 로드 실패:", error)
        if (!cancelled) setLoadError("설문을 불러오지 못했습니다.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    if (id && id !== "new") {
      void load()
    } else {
      setIsLoading(false)
      setLoadError("유효하지 않은 설문 링크입니다.")
    }

    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center">
            <img
              src={BRAND_LOGO_SRC}
              alt="BOMI"
              className="h-7 w-auto object-contain"
            />
          </Link>
          <span className="text-xs text-muted-foreground">만족도 조사</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm">설문을 불러오는 중입니다.</p>
          </div>
        ) : loadError ? (
          <p className="py-24 text-center text-sm text-muted-foreground">
            {loadError}
          </p>
        ) : detail ? (
          <SurveyResponseForm detail={detail} />
        ) : (
          <p className="py-24 text-center text-sm text-muted-foreground">
            설문을 찾을 수 없습니다.
          </p>
        )}
      </main>
    </div>
  )
}
