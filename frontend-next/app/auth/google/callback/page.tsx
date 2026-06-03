"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { useAuth } from "@/components/auth/auth-provider"
import { setClientSession } from "@/lib/auth/session"
import { apiFetch } from "@/lib/api-client"
import type { AuthSession } from "@/services/auth.types"
import type { RegionId } from "@/lib/auth/regions"

function GoogleCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-sm text-muted-foreground">Google 캘린더 연동 처리 중...</p>
    </div>
  )
}

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh } = useAuth()
  const [message, setMessage] = useState("Google 캘린더 연동 처리 중...")

  useEffect(() => {
    const error = searchParams.get("error")
    if (error) {
      setMessage(
        error === "google_auth_cancelled"
          ? "Google 연동이 취소되었습니다."
          : decodeURIComponent(error),
      )
      return
    }

    const token = searchParams.get("token")
    const regionId = searchParams.get("regionId") as RegionId | null

    if (!token || !regionId) {
      setMessage("연동 정보가 올바르지 않습니다.")
      return
    }

    const sessionToken = token
    const sessionRegionId = regionId

    async function completeLogin() {
      try {
        const headers = new Headers({
          Authorization: `Bearer ${sessionToken}`,
          "X-Region-Id": sessionRegionId,
        })
        const session = await apiFetch<AuthSession>("/api/v1/auth/session", {
          headers,
        })
        setClientSession({ ...session, token: sessionToken })
        await refresh()
        router.replace("/dashboard?googleCalendar=connected")
      } catch {
        setMessage("세션을 불러오지 못했습니다. 다시 로그인해 주세요.")
      }
    }

    void completeLogin()
  }, [searchParams, refresh, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<GoogleCallbackFallback />}>
      <GoogleCallbackContent />
    </Suspense>
  )
}
