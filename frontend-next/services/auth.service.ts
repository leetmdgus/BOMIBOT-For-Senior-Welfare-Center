/**
 * 인증·세션 (FastAPI 연동 예정)
 *
 * 현재 UI는 인증 없이 목업으로 동작합니다.
 * 백엔드 연동 시 login / logout / getSession 을 api·mock 쌍으로 구현하세요.
 */

export type AuthSession = {
  userId: string
  name: string
  email: string
  role: "admin" | "manager" | "member"
}

export async function getSession(): Promise<AuthSession | null> {
  return null
}

export async function login(_email: string, _password: string): Promise<AuthSession> {
  throw new Error("인증 API가 아직 연결되지 않았습니다.")
}

export async function logout(): Promise<void> {
  return
}
