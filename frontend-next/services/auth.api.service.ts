import { apiClient, resolveApiPath } from "@/lib/api-client"
import {
  clearClientSession,
  getClientSession,
  setClientSession,
} from "@/lib/auth/session"
import type {
  AuthSession,
  ChangePasswordRequest,
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

async function fetchSessionFromServer(): Promise<AuthSession | null> {
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

export async function getSession(): Promise<AuthSession | null> {
  const local = getClientSession()
  if (local) return local
  return fetchSessionFromServer()
}

/** localStorage 캐시 무시 — 프로필 사진 등 서버 변경 반영 */
export async function refreshSession(): Promise<AuthSession | null> {
  const local = getClientSession()
  if (!local?.token) return fetchSessionFromServer()
  const refreshed = await fetchSessionFromServer()
  return refreshed ?? local
}

export async function changePassword(
  request: ChangePasswordRequest,
): Promise<void> {
  await apiClient.patch<void>(
    resolveApiPath("/api/auth/password", "/api/v1/auth/password"),
    request,
  )
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
