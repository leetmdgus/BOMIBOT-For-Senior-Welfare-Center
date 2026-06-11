"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "next/navigation"

import { clearApiGetCache } from "@/lib/api-get-cache"
import { prefetchAppData } from "@/lib/prefetch-app-data"
import {
  isCurrentSessionEmployee,
  sessionProfilePatchFromEmployee,
} from "@/lib/auth/sync-session-from-employee"
import {
  ensureSessionCookie,
  getClientSession,
  setClientSession,
} from "@/lib/auth/session"
import {
  logout as logoutService,
  refreshSession,
} from "@/services/auth.service"
import type { AuthSession } from "@/services/auth.types"
import type { Employee } from "@/services/organization.types"

interface AuthContextValue {
  session: AuthSession | null
  isLoading: boolean
  refresh: (merge?: Partial<AuthSession>) => Promise<void>
  patchSession: (patch: Partial<AuthSession>) => void
  /** 조직현황에서 본인 프로필(사진 등) 변경 시 사이드바·헤더·대시보드 반영 */
  syncFromEmployee: (
    employee: Pick<
      Employee,
      "id" | "email" | "name" | "role" | "department" | "profileImage"
    >,
    linkedEmployeeId?: string | null,
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async (merge?: Partial<AuthSession>) => {
    const next = await refreshSession()
    if (!next) {
      setSession(null)
      return
    }
    const merged = merge ? { ...next, ...merge } : next
    if (merge) setClientSession(merged)
    setSession(merged)
  }, [])

  const patchSession = useCallback((patch: Partial<AuthSession>) => {
    setSession((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      setClientSession(next)
      return next
    })
  }, [])

  const syncFromEmployee = useCallback(
    async (
      employee: Pick<
        Employee,
        "id" | "email" | "name" | "role" | "department" | "profileImage"
      >,
      linkedEmployeeId?: string | null,
    ) => {
      const current = getClientSession()
      if (!current || !isCurrentSessionEmployee(current, employee, linkedEmployeeId)) {
        return
      }
      const patch = sessionProfilePatchFromEmployee(employee)
      patchSession(patch)
      await refresh(patch)
    },
    [patchSession, refresh],
  )

  useEffect(() => {
    ensureSessionCookie()
    refreshSession()
      .then((next) => {
        setSession(next)
        if (next?.token) prefetchAppData()
      })
      .finally(() => setIsLoading(false))
  }, [])

  const logout = useCallback(async () => {
    await logoutService()
    clearApiGetCache()
    setSession(null)
    router.replace("/login")
  }, [router])

  const value = useMemo(
    () => ({
      session,
      isLoading,
      refresh,
      patchSession,
      syncFromEmployee,
      logout,
    }),
    [session, isLoading, refresh, patchSession, syncFromEmployee, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
