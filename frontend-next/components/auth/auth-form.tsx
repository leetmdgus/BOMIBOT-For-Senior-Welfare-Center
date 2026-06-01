"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { BrandLogo } from "@/components/common/brand-logo"
import { useAuth } from "@/components/auth/auth-provider"
import { RegionSelect } from "@/components/auth/region-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { RegionId } from "@/lib/auth/regions"
import { prefetchAppData } from "@/lib/prefetch-app-data"
import { login, signup } from "@/services/auth.service"
import { cn } from "@/lib/utils"

type AuthMode = "login" | "signup"

export function AuthForm({ initialMode = "login" }: { initialMode?: AuthMode }) {
  const router = useRouter()
  const { refresh } = useAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [regionId, setRegionId] = useState<RegionId>("chuncheon-north")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [department, setDepartment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === "login") {
        await login({ email, password, regionId })
      } else {
        await signup({ email, password, name, department, regionId })
      }
      await refresh()
      prefetchAppData()
      router.replace("/dashboard")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "요청 처리 중 오류가 발생했습니다.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-10 flex flex-col items-center text-center">
        <BrandLogo size="hero" priority />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">봄이봇</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          복지기관 사업관리 시스템
        </p>
      </div>

      <div className="mb-6 flex rounded-lg bg-muted p-1">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground",
          )}
          onClick={() => setMode("login")}
        >
          로그인
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground",
          )}
          onClick={() => setMode("signup")}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label>지역 선택</Label>
          <RegionSelect value={regionId} onChange={setRegionId} />
        </div>

        {mode === "signup" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="홍길동"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">부서</Label>
              <Input
                id="department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="운영총괄"
                required
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={
              regionId === "chuncheon-north"
                ? "admin@north.bomi.local"
                : "admin@east.bomi.local"
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "처리 중..."
            : mode === "login"
              ? "로그인"
              : "회원가입"}
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">관리자 계정 (데모)</p>
        <ul className="mt-2 space-y-1">
          <li>
            <strong>북부</strong> admin@north.bomi.local / bomi-north-2026
          </li>
          <li>
            <strong>동부</strong> admin@east.bomi.local / bomi-east-2026
          </li>
        </ul>
      </div>
    </div>
  )
}
