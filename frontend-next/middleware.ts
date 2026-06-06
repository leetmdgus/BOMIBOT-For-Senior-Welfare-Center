import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  parseSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/server-session"

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/api/auth",
  "/api/chat",
]

/** Next 프록시 — FastAPI에서 region 없이 제공하는 칸반 정적 메타 */
const PUBLIC_API_PATHS = [
  "/api/kanban/project-image-options",
  "/api/kanban/staff",
  "/api/kanban/column-types",
  "/api/kanban/task-path-map",
  "/api/kanban/categories/column-type",
]

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true
  if (pathname.includes(".")) return true
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) return true
  if (PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true
  }
  // 공개 설문(QR) — 로그인 없이 목록·상세·응답 제출
  if (pathname.startsWith("/api/public/")) return true
  if (pathname === "/survey/list" || pathname.startsWith("/survey/list")) return true
  if (/^\/survey\/[^/]+\/respond/.test(pathname)) return true
  return false
}

function hasProxyApiAuth(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (parseSessionCookie(sessionCookie)) return true
  const authorization = request.headers.get("authorization")
  return Boolean(authorization?.startsWith("Bearer "))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = parseSessionCookie(sessionCookie)

  if (!session && pathname.startsWith("/api/")) {
    if (!hasProxyApiAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  if (!session && !pathname.startsWith("/api/")) {
    // 비로그인 사용자가 설문 관리 URL(/survey/{id})로 들어오면 로그인 대신
    // 공개 응답 페이지(/survey/{id}/respond)로 보낸다. region 등 쿼리는 보존.
    const surveyDetailMatch = pathname.match(/^\/survey\/([^/]+)$/)
    if (surveyDetailMatch && surveyDetailMatch[1] !== "new") {
      const respondUrl = request.nextUrl.clone()
      respondUrl.pathname = `/survey/${surveyDetailMatch[1]}/respond`
      return NextResponse.redirect(respondUrl)
    }

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (session && (pathname === "/login" || pathname === "/signup")) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = "/dashboard"
    dashboardUrl.search = ""
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
