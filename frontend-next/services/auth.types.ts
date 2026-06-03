import type { RegionId } from "@/lib/auth/regions"

export type AuthRole = "admin" | "user"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  roleType: AuthRole
  department: string
  regionId: RegionId
  profileImage?: string
}

export interface AuthSession extends AuthUser {
  token: string
  regionLabel: string
  orgName: string
  googleCalendarConnected?: boolean
}

export interface GoogleCalendarStatus {
  connected: boolean
  email?: string
  connectedAt?: string | null
}

export interface LoginRequest {
  email: string
  password: string
  regionId: RegionId
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface SignupRequest {
  email: string
  password: string
  name: string
  department: string
  regionId: RegionId
}

export interface AuthErrorBody {
  error: string
}
