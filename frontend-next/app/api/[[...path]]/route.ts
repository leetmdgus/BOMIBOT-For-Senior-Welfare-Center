import { NextRequest, NextResponse } from "next/server"

import { applyProxyAuthHeaders } from "@/lib/auth/proxy-auth-headers"
import {
  buildProxyUrl,
  getApiProxyBase,
  mapNextApiPathToFastApi,
} from "@/lib/api-proxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FORWARD_HEADERS = [
  "authorization",
  "content-type",
  "content-length",
  "content-disposition",
  "x-region-id",
  "x-user-name",
  "x-user-name-b64",
  "cookie",
] as const

/** multipart/binary는 text()로 읽으면 업로드가 깨짐 */
async function readProxyRequestBody(
  request: NextRequest,
): Promise<BodyInit | undefined> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/octet-stream")
  ) {
    return await request.arrayBuffer()
  }

  return await request.text()
}

async function proxyRequest(request: NextRequest, path: string[]) {
  const apiBase = getApiProxyBase()

  if (!apiBase) {
    return NextResponse.json(
      {
        error:
          "FastAPI가 설정되지 않았습니다. NEXT_PUBLIC_API_BASE_URL을 설정하거나 NEXT_PUBLIC_USE_MOCK_API=true를 사용하세요.",
      },
      { status: 503 },
    )
  }

  const fastApiPath = mapNextApiPathToFastApi(path)
  const targetUrl = buildProxyUrl(fastApiPath, request.nextUrl.search)

  const headers = new Headers()
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  applyProxyAuthHeaders(request, headers)

  const init: RequestInit = {
    method: request.method,
    headers,
  }

  const body = await readProxyRequestBody(request)
  if (body !== undefined) {
    init.body = body
  }

  const fetchInit: RequestInit = {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  }

  try {
    const upstream = await fetch(targetUrl, fetchInit)
    const responseHeaders = new Headers()
    const contentType = upstream.headers.get("content-type")
    if (contentType) responseHeaders.set("content-type", contentType)

    const setCookie = upstream.headers.get("set-cookie")
    if (setCookie) responseHeaders.set("set-cookie", setCookie)

    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: "FastAPI 프록시 연결 실패",
        detail: message,
        target: targetUrl,
      },
      { status: 502 },
    )
  }
}

type RouteContext = { params: Promise<{ path?: string[] }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params
  return proxyRequest(request, path)
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params
  return proxyRequest(request, path)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params
  return proxyRequest(request, path)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params
  return proxyRequest(request, path)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params
  return proxyRequest(request, path)
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params
  return proxyRequest(request, path)
}
