import * as apiService from "./auth.api.service"
import * as mockService from "./auth.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const authService = useMockApi ? mockService : apiService

export type {
  AuthSession,
  AuthRole,
  LoginRequest,
  SignupRequest,
} from "./auth.types"

export const login = authService.login
export const signup = authService.signup
export const getSession = authService.getSession
export const logout = authService.logout
