import { apiClient, resolveApiPath } from "@/lib/api-client"
import {
  clearClientSession,
  getClientSession,
  setClientSession,
} from "@/lib/auth/session"
import type {
  AuthSession,
  LoginRequest,
  SignupRequest,
} from "./auth.types"

export async function login(request: LoginRequest): Promise<AuthSession> {
  const session = await apiClient.post<AuthSession>(
    resolveApiPath("/api/auth/login", "/api/v1/auth/login"),
    request,
    { skipSessionAuth: true },
  )
  setClientSession(session)
  return session
}

export async function signup(request: SignupRequest): Promise<AuthSession> {
  const session = await apiClient.post<AuthSession>(
    resolveApiPath("/api/auth/signup", "/api/v1/auth/signup"),
    request,
    { skipSessionAuth: true },
  )
  setClientSession(session)
  return session
}

export async function getSession(): Promise<AuthSession | null> {
  const local = getClientSession()
  if (local) return local

  try {
    const session = await apiClient.get<AuthSession>(
      resolveApiPath("/api/auth/session", "/api/v1/auth/session"),
    )
    setClientSession(session)
    return session
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post<void>(
      resolveApiPath("/api/auth/logout", "/api/v1/auth/logout"),
      undefined,
      { skipSessionAuth: true },
    )
  } finally {
    clearClientSession()
  }
}
