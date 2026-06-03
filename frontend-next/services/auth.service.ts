import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./auth.api.service"
import * as mockService from "./auth.mock.service"

const authService = shouldUseMockApi() ? mockService : apiService

export type {
  AuthSession,
  AuthRole,
  ChangePasswordRequest,
  LoginRequest,
  SignupRequest,
} from "./auth.types"

export const login = authService.login
export const signup = authService.signup
export const getSession = authService.getSession
export const refreshSession = authService.refreshSession
export const logout = authService.logout
export const changePassword = authService.changePassword
