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
import { ensureSessionCookie } from "@/lib/auth/session"
import { getSession, logout as logoutService } from "@/services/auth.service"
import type { AuthSession } from "@/services/auth.types"

interface AuthContextValue {
  session: AuthSession | null
  isLoading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const next = await getSession()
    setSession(next)
  }, [])

  useEffect(() => {
    ensureSessionCookie()
    getSession()
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
    () => ({ session, isLoading, refresh, logout }),
    [session, isLoading, refresh, logout],
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
