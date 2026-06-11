"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronRight, ClipboardList, Loader2 } from "lucide-react"

import { BrandLogo } from "@common/components/brand-logo"
import { getClientSession } from "@/lib/auth/session"
import { getPublicSurveyList } from "@/services/survey.service"
import type { SurveyListItem } from "@/services/survey.types"

/** 비로그인 공개 설문 목록 — QR/링크의 ?region=, 없으면 로그인 세션 지역으로 폴백 */
export function SurveyPublicListPage() {
  const searchParams = useSearchParams()
  const region =
    searchParams.get("region") ?? getClientSession()?.regionId ?? undefined

  const [items, setItems] = useState<SurveyListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getPublicSurveyList(region ?? "")
        if (!cancelled) setItems(data)
      } catch (err) {
        console.error("공개 설문 목록 로드 실패:", err)
        if (!cancelled) setError("설문 목록을 불러오지 못했습니다.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    if (region) {
      void load()
    } else {
      setIsLoading(false)
      setError("지역 정보가 없는 링크입니다. 올바른 QR/링크로 다시 접속해 주세요.")
    }

    return () => {
      cancelled = true
    }
  }, [region])

  // 응답 가능한(진행중) 설문만 노출
  const respondable = items.filter((item) => item.status === "진행중")

  const respondHref = (id: string) =>
    region
      ? `/survey/${id}/respond?region=${encodeURIComponent(region)}`
      : `/survey/${id}/respond`

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
        <h1 className="mb-1 text-xl font-bold text-foreground">
          응답 가능한 설문
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          참여할 설문을 선택해 응답해 주세요.
        </p>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm">설문 목록을 불러오는 중입니다.</p>
          </div>
        ) : error ? (
          <p className="py-24 text-center text-sm text-muted-foreground">{error}</p>
        ) : respondable.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
            <ClipboardList className="size-10" />
            <p className="text-sm">현재 응답 가능한 설문이 없습니다.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {respondable.map((item) => (
              <li key={item.id}>
                <Link
                  href={respondHref(item.id)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {item.title}
                    </p>
                    {item.program ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.program}
                      </p>
                    ) : null}
                    {item.endDate ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        마감 {item.endDate}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
