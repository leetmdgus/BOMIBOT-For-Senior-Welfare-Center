import { getRegionInfo } from "@/lib/auth/regions"
import {
  clearClientSession,
  getClientSession,
  setClientSession,
} from "@/lib/auth/session"
import {
  findUserByCredentials,
  registerUser,
  toAuthUser,
  updateMockUserPassword,
} from "@/lib/mocks/auth-users.mock"
import type {
  AuthSession,
  ChangePasswordRequest,
  LoginRequest,
  SignupRequest,
} from "./auth.types"

function createSession(user: ReturnType<typeof toAuthUser>): AuthSession {
  const region = getRegionInfo(user.regionId)
  return {
    ...user,
    token: `mock-token-${user.id}-${Date.now()}`,
    regionLabel: region.label,
    orgName: region.orgName,
  }
}

export async function login(request: LoginRequest): Promise<AuthSession> {
  const user = findUserByCredentials(
    request.email,
    request.password,
    request.regionId,
  )

  if (!user) {
    throw new Error("이메일, 비밀번호 또는 지역이 올바르지 않습니다.")
  }

  const session = createSession(toAuthUser(user))
  setClientSession(session)
  return session
}

export async function signup(request: SignupRequest): Promise<AuthSession> {
  const user = registerUser({
    email: request.email,
    password: request.password,
    name: request.name,
    department: request.department,
    regionId: request.regionId,
  })

  const session = createSession(toAuthUser(user))
  setClientSession(session)
  return session
}

export async function getSession(): Promise<AuthSession | null> {
  return getClientSession()
}

export async function refreshSession(): Promise<AuthSession | null> {
  return getClientSession()
}

export async function changePassword(
  request: ChangePasswordRequest,
): Promise<void> {
  const session = getClientSession()
  if (!session?.token) {
    throw new Error("로그인이 필요합니다.")
  }
  updateMockUserPassword(
    session.id,
    session.regionId,
    request.currentPassword,
    request.newPassword,
  )
}

export async function logout(): Promise<void> {
  clearClientSession()
}
