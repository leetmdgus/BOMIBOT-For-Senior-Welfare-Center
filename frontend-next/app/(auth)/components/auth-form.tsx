"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { BrandLogo } from "@common/components/brand-logo"
import { useAuth } from "@common/components/auth-provider"
import { RegionSelect } from "@auth/components/region-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { RegionId } from "@/lib/auth/regions"
import { prefetchAppData } from "@/lib/prefetch-app-data"
import { login, signup } from "@/services/auth.service"
import { getPublicDepartmentOptions } from "@/services/organization.service"
import type { DepartmentOption } from "@/services/organization.types"
import { cn } from "@/lib/utils"

type AuthMode = "login" | "signup"

/** 조직현황에 해당 부서가 없거나 선택하지 않은 경우 기본값 */
const DEPARTMENT_FALLBACK = "기타"

export function AuthForm({ initialMode = "login" }: { initialMode?: AuthMode }) {
  const router = useRouter()
  const { refresh } = useAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [regionId, setRegionId] = useState<RegionId>("chuncheon-north")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [department, setDepartment] = useState(DEPARTMENT_FALLBACK)
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 회원가입 부서 선택지를 선택한 지역의 조직현황에서 가져온다.
  // 실패하거나 비어 있으면 "기타"만 남는다(폴백).
  useEffect(() => {
    if (mode !== "signup") return
    let cancelled = false

    getPublicDepartmentOptions(regionId)
      .then((options) => {
        if (cancelled) return
        const filtered = options.filter((dept) => dept.id !== "all" && dept.name)
        setDepartments(filtered)
        // 지역을 바꿨을 때 이전 선택이 새 지역에 없으면 "기타"로 되돌린다.
        setDepartment((current) =>
          filtered.some((dept) => dept.name === current)
            ? current
            : DEPARTMENT_FALLBACK,
        )
      })
      .catch(() => {
        if (cancelled) return
        setDepartments([])
        setDepartment(DEPARTMENT_FALLBACK)
      })

    return () => {
      cancelled = true
    }
  }, [mode, regionId])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === "login") {
        await login({ email, password, regionId })
      } else {
        await signup({
          email,
          password,
          name,
          department: department || DEPARTMENT_FALLBACK,
          regionId,
        })
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
              <select
                id="department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                required
                className={cn(
                  "border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] md:text-sm",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                )}
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
                {departments.every((dept) => dept.name !== DEPARTMENT_FALLBACK) && (
                  <option value={DEPARTMENT_FALLBACK}>{DEPARTMENT_FALLBACK}</option>
                )}
              </select>
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
