"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"

import { getPublicSurveyDetail, getSurveyDetail } from "@/services/survey.service"
import type { SurveyDetail } from "@/services/survey.types"
import { getClientSession } from "@/lib/auth/session"
import { BrandLogo } from "@/components/common/brand-logo"
import { SurveyResponseForm } from "./survey-response-form"

export function SurveyRespondPage({ id: idFromProps }: { id?: string }) {
  const routeParams = useParams()
  const routeId = routeParams?.id
  const id =
    idFromProps ??
    (typeof routeId === "string" ? routeId : Array.isArray(routeId) ? routeId[0] : "")
  const searchParams = useSearchParams()
  const region = searchParams.get("region") ?? undefined
  // 목록 back 링크용 — URL에 region이 없으면 로그인 세션 지역으로 폴백
  const listRegion = region ?? getClientSession()?.regionId ?? undefined

  const [detail, setDetail] = useState<SurveyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const data = region
          ? await getPublicSurveyDetail(region, id)
          : await getSurveyDetail(id)
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
  }, [id, region])

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo size="lg" />
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
          <div className="space-y-4">
            <Link
              href={
                listRegion
                  ? `/survey/list?region=${encodeURIComponent(listRegion)}`
                  : "/survey/list"
              }
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              응답 가능한 설문 목록
            </Link>
            <SurveyResponseForm detail={detail} regionId={region} />
          </div>
        ) : (
          <p className="py-24 text-center text-sm text-muted-foreground">
            설문을 찾을 수 없습니다.
          </p>
        )}
      </main>
    </div>
  )
}
