"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { UserMenu } from "@/components/common/user-menu"
import { VersionHistorySheet } from "@/components/kanban/version-history/version-history-sheet"

type BreadcrumbItem = {
  title: string
  path?: string
}

type PageLink = {
  title: string
  path: string
  breadcrumbs?: BreadcrumbItem[]
}

const pageLinks: PageLink[] = [
  { title: "대시보드", path: "/dashboard" },
  { title: "조직현황", path: "/organization" },
  { title: "사업관리", path: "/kanban" },
  { title: "문서자동화", path: "/automation" },
  { title: "파일들", path: "/files" },
  { title: "연간 보고서", path: "/ebooks" },
  { title: "메뉴 관리", path: "/settings/menu" },
  { title: "전자결재", path: "/approvals" },

  {
    title: "사업문서",
    path: "/kanban/documents",
    breadcrumbs: [
      { title: "사업관리", path: "/kanban" },
      { title: "대시보드", path: "/dashboard" },
      { title: "사업문서", path: "/kanban/documents" },
    ],
  },

  {
    title: "실적 입력",
    path: "/kanban/task/[id]/performance/input",
    breadcrumbs: [
      { title: "사업관리", path: "/kanban" },
      { title: "실적관리" },
      { title: "입력" },
    ],
  },
  {
    title: "실적 계획",
    path: "/kanban/task/[id]/performance/plan",
    breadcrumbs: [
      { title: "사업관리", path: "/kanban" },
      { title: "실적관리" },
      { title: "계획" },
    ],
  },
  {
    title: "실적 현황",
    path: "/kanban/task/[id]/performance/actual",
    breadcrumbs: [
      { title: "사업관리", path: "/kanban" },
      { title: "실적관리" },
      { title: "현황" },
    ],
  },
  {
    title: "실적 결과",
    path: "/kanban/task/[id]/performance/result",
    breadcrumbs: [
      { title: "사업관리", path: "/kanban" },
      { title: "실적관리" },
      { title: "결과" },
    ],
  },
  {
    title: "사업계획",
    path: "/kanban/task/[id]/business-plan",
    breadcrumbs: [
      { title: "사업관리", path: "/kanban" },
      { title: "사업계획" },
    ],
  },
  {
    title: "만족도조사",
    path: "/kanban/task/[id]/survey",
    breadcrumbs: [
      { title: "사업관리", path: "/kanban" },
      { title: "만족도조사" },
    ],
  },
  {
    title: "사업평가",
    path: "/kanban/task/[id]/evaluation",
    breadcrumbs: [
      { title: "사업관리", path: "/kanban" },
      { title: "사업평가" },
    ],
  },
]

function matchPath(pathname: string, routePath: string) {
  const routeSegments = routePath.split("/")
  const pathnameSegments = pathname.split("/")

  if (routeSegments.length !== pathnameSegments.length) return false

  return routeSegments.every((segment, index) => {
    if (segment.startsWith("[") && segment.endsWith("]")) return true
    return segment === pathnameSegments[index]
  })
}

function getCurrentPage(pathname: string) {
  if (pathname.startsWith("/kanban/documents")) {
    return (
      pageLinks.find((page) => page.path === "/kanban/documents") ?? pageLinks[0]
    )
  }

  return pageLinks.find((page) => matchPath(pathname, page.path)) ?? pageLinks[0]
}

function getBreadcrumbs(currentPage: PageLink, orgName: string): BreadcrumbItem[] {
  return [
    { title: "산하기관" },
    { title: orgName },
    ...(currentPage.breadcrumbs ?? [
      {
        title: currentPage.title,
        path: currentPage.path,
      },
    ]),
  ]
}

interface HeaderProps {
  kanbanYear?: string
}

export function Header({ kanbanYear }: HeaderProps) {
  const pathname = usePathname()
  const { session } = useAuth()
  const orgName = session?.orgName ?? "복지관"

  const currentPage = useMemo(() => getCurrentPage(pathname), [pathname])
  const breadcrumbs = useMemo(
    () => getBreadcrumbs(currentPage, orgName),
    [currentPage, orgName],
  )

  const isKanbanPage = pathname === "/kanban"

  return (
    <header className="print-hide border-b border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">{currentPage.title}</h1>

          <nav
            aria-label="breadcrumb"
            className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          >
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1

              return (
                <div
                  key={`${item.title}-${index}`}
                  className="flex items-center gap-1"
                >
                  {index > 0 && <ChevronRight className="size-3.5" />}

                  {item.path && !isLast ? (
                    <Link
                      href={item.path}
                      className="transition-colors hover:text-primary"
                    >
                      {item.title}
                    </Link>
                  ) : item.path && isLast ? (
                    <Link
                      href={item.path}
                      aria-current="page"
                      className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span
                      className={
                        isLast ? "font-medium text-foreground" : undefined
                      }
                    >
                      {item.title}
                    </span>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          {isKanbanPage ? <VersionHistorySheet year={kanbanYear} /> : null}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}