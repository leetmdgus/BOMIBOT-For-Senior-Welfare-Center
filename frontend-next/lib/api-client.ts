import { clearClientSession, getClientSession } from "@/lib/auth/session"
import { parseContentDispositionFilename } from "@/lib/files/download-blob"

/** Production: https://api-workspace.bomi.ai.kr — see docs/DEPLOYMENT.md */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? ""

/** 서버 전용 — 브라우저 번들에는 `NEXT_PUBLIC_*` 만 포함됨 */
const SERVER_PROXY_URL = process.env.API_PROXY_URL?.replace(/\/$/, "") ?? ""

/** 브라우저·서버 공통 (로컬 프록시 대상 FastAPI) */
const PUBLIC_PROXY_URL =
  process.env.NEXT_PUBLIC_API_PROXY_URL?.replace(/\/$/, "") ?? ""

const PROXY_TARGET = SERVER_PROXY_URL || PUBLIC_PROXY_URL || ""

/** 로컬 권장: 브라우저는 same-origin `/api/*` → Next가 FastAPI로 프록시 (CORS·SW 회피) */
const USE_API_PROXY =
  process.env.NEXT_PUBLIC_USE_API_PROXY === "true" ||
  (!API_BASE && Boolean(PROXY_TARGET))

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

/** 로컬 FastAPI 직연동 URL — 브라우저에서 쓰면 CORS·Workbox ERR_FAILED */
const LOCAL_API_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1):8020\/?$/i

function isLocalApiBase(base: string): boolean {
  return LOCAL_API_PATTERN.test(base)
}

/** Vercel 등 원격 API만 브라우저 직연동 */
function isProductionRemoteApi(): boolean {
  return Boolean(API_BASE && !isLocalApiBase(API_BASE))
}

/** 브라우저: same-origin `/api/*` → Next 프록시. 서버: PROXY_TARGET 또는 직연동 */
function useBrowserProxy(): boolean {
  if (typeof window === "undefined") {
    return (
      USE_API_PROXY ||
      Boolean(PROXY_TARGET) ||
      !API_BASE ||
      isLocalApiBase(API_BASE)
    )
  }
  if (isProductionRemoteApi()) return false
  return true
}

/** Next interim route vs FastAPI `/api/v1` path */
export function resolveApiPath(nextPath: string, fastApiPath: string): string {
  if (useBrowserProxy()) return nextPath
  if (API_BASE) return fastApiPath
  return nextPath
}

export function isFastApiMode(): boolean {
  return Boolean(API_BASE || PROXY_TARGET || USE_API_PROXY)
}

/** fetch Headers는 ISO-8859-1만 허용 — 한글 등은 Base64(UTF-8)로 전송 */
function encodeUserNameHeader(name: string): { header: string; value: string } {
  if (/^[\x00-\xff]*$/.test(name)) {
    return { header: "X-User-Name", value: name }
  }
  const bytes = new TextEncoder().encode(name)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return { header: "X-User-Name-B64", value: btoa(binary) }
}

function buildUrl(path: string): string {
  if (path.startsWith("http")) return path
  const normalized = path.startsWith("/") ? path : `/${path}`

  if (typeof window !== "undefined" && useBrowserProxy()) {
    return normalized
  }

  if (API_BASE && !useBrowserProxy()) return `${API_BASE}${normalized}`
  return normalized
}

/** 개발 시 잘못된 URL 감지용 */
export function isBrowserUsingApiProxy(): boolean {
  return typeof window !== "undefined" && useBrowserProxy()
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export type ApiFetchOptions = RequestInit & {
  /** 로그인/회원가입 등 — 남아 있는 세션 헤더로 CORS preflight가 실패하지 않도록 */
  skipSessionAuth?: boolean
}

function formatApiErrorMessage(
  path: string,
  status: number,
  body: unknown,
): string {
  if (typeof body === "object" && body !== null) {
    if ("error" in body && typeof (body as { error: unknown }).error === "string") {
      return (body as { error: string }).error
    }
    const detail = (body as { detail?: unknown }).detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string }
      if (typeof first?.msg === "string") return first.msg
    }
  }

  if (status === 401) {
    return "로그인이 만료되었거나 인증 정보가 없습니다. 다시 로그인해 주세요."
  }
  if (status === 404) {
    const msg =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error?: unknown }).error ?? "")
        : ""
    if (
      msg.includes("파일 본문") ||
      msg.includes("File content not found") ||
      msg.includes("업로드된 실제 파일이 없습니다")
    ) {
      return msg.includes("예시")
        ? msg
        : "파일 본문을 찾을 수 없습니다. 서버 저장소 초기화 등으로 삭제되었을 수 있습니다. 다시 업로드해 주세요."
    }
  }
  if (status === 502 || status === 503) {
    const detail =
      typeof body === "object" && body !== null && "detail" in body
        ? String((body as { detail?: unknown }).detail ?? "")
        : ""
    const target =
      typeof body === "object" && body !== null && "target" in body
        ? String((body as { target?: unknown }).target ?? "")
        : ""
    const hint =
      "FastAPI(8020)가 실행 중인지 확인하세요: cd backend && docker compose up -d api"
    if (detail.includes("ECONNREFUSED") || detail.includes("fetch failed")) {
      return `API 서버에 연결할 수 없습니다. ${hint}${target ? ` (${target})` : ""}`
    }
    return (
      (typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : "API 서버에 연결할 수 없습니다.") +
      (target ? ` — ${target}` : "") +
      ` ${hint}`
    )
  }
  if (status === 500) {
    return "서버 내부 오류(500)입니다. API 로그를 확인하거나 잠시 후 다시 시도해 주세요."
  }

  return `API 요청 실패 (${status}): ${path}`
}

function handleUnauthorized(path: string, skipSessionAuth?: boolean): void {
  if (skipSessionAuth || typeof window === "undefined") return

  clearClientSession()
  const loginPath = "/login"
  if (window.location.pathname.startsWith(loginPath)) return

  const from = encodeURIComponent(
    `${window.location.pathname}${window.location.search}`,
  )
  window.location.replace(`${loginPath}?from=${from}&reason=session`)
}

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions,
): Promise<T> {
  const { skipSessionAuth, ...fetchInit } = init ?? {}
  const session = skipSessionAuth ? null : getClientSession()
  const headers = new Headers(fetchInit.headers)

  if (!headers.has("Content-Type") && fetchInit.body) {
    headers.set("Content-Type", "application/json")
  }

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`)
  }

  if (session?.regionId) {
    headers.set("X-Region-Id", session.regionId)
  }

  if (session?.name) {
    const { header, value } = encodeUserNameHeader(session.name)
    headers.set(header, value)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path), {
      ...fetchInit,
      headers,
      credentials: "include",
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error)
    const proxyHint =
      typeof window !== "undefined" && useBrowserProxy()
        ? " FastAPI(8020) 실행 여부와 frontend-next/.env.local 의 API_PROXY_URL을 확인하세요."
        : " API 서버(URL) 연결을 확인하세요."
    throw new ApiError(
      message === "Failed to fetch"
        ? `API 서버에 연결할 수 없습니다.${proxyHint}`
        : `네트워크 오류: ${message}`,
      0,
    )
  }

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = undefined
    }
    const message = formatApiErrorMessage(path, response.status, body)

    if (response.status === 401) {
      handleUnauthorized(path, skipSessionAuth)
    }

    throw new ApiError(message, response.status, body)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export type ApiBlobResult = {
  blob: Blob
  filename: string | null
}

export async function apiFetchBlob(
  path: string,
  init?: RequestInit,
): Promise<Blob> {
  const result = await apiFetchBlobWithMeta(path, init)
  return result.blob
}

export async function apiFetchBlobWithMeta(
  path: string,
  init?: RequestInit,
): Promise<ApiBlobResult> {
  const session = getClientSession()
  const headers = new Headers(init?.headers)

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`)
  }

  if (session?.regionId) {
    headers.set("X-Region-Id", session.regionId)
  }

  if (session?.name) {
    const { header, value } = encodeUserNameHeader(session.name)
    headers.set(header, value)
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: "include",
  })

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = undefined
    }
    throw new ApiError(
      formatApiErrorMessage(path, response.status, body),
      response.status,
      body,
    )
  }

  const blob = await response.blob()
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase()
  if (
    contentType.includes("application/json") ||
    contentType.includes("text/")
  ) {
    throw new ApiError(
      "파일 대신 오류 응답을 받았습니다. API 서버 상태를 확인하세요.",
      response.status,
    )
  }

  return {
    blob,
    filename: parseContentDispositionFilename(
      response.headers.get("content-disposition"),
    ),
  }
}

export async function apiFetchText(
  path: string,
  init?: RequestInit,
): Promise<string> {
  const session = getClientSession()
  const headers = new Headers(init?.headers)

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json")
  }

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`)
  }

  if (session?.regionId) {
    headers.set("X-Region-Id", session.regionId)
  }

  if (session?.name) {
    const { header, value } = encodeUserNameHeader(session.name)
    headers.set(header, value)
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: "include",
  })

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = undefined
    }
    throw new ApiError(
      formatApiErrorMessage(path, response.status, body),
      response.status,
      body,
    )
  }

  return response.text()
}

export async function apiUploadFormData<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const session = getClientSession()
  const headers = new Headers()

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`)
  }

  if (session?.regionId) {
    headers.set("X-Region-Id", session.regionId)
  }

  if (session?.name) {
    const { header, value } = encodeUserNameHeader(session.name)
    headers.set(header, value)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path), {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error)
    throw new ApiError(
      message === "Failed to fetch"
        ? "프로필 사진 업로드에 실패했습니다. API 서버(8020) 연결을 확인해 주세요."
        : `네트워크 오류: ${message}`,
      0,
    )
  }

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = undefined
    }
    throw new ApiError(
      formatApiErrorMessage(path, response.status, body),
      response.status,
      body,
    )
  }

  return (await response.json()) as T
}

export const apiClient = {
  get: <T>(path: string, init?: ApiFetchOptions) => apiFetch<T>(path, init),
  post: <T>(path: string, body?: unknown, init?: ApiFetchOptions) =>
    apiFetch<T>(path, {
      ...init,
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
}
