"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Eye, GitBranch, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

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
  { title: "전자책자", path: "/ebooks" },

  {
    title: "실적관리",
    path: "/kanban/documents/performance",
    breadcrumbs: [
      { title: "문서" },
      { title: "실적관리", path: "/kanban/documents/performance" },
    ],
  },
  {
    title: "예산관리",
    path: "/kanban/documents/budget",
    breadcrumbs: [
      { title: "문서" },
      { title: "예산관리", path: "/kanban/documents/budget" },
    ],
  },
  {
    title: "사업계획",
    path: "/kanban/documents/business-plan",
    breadcrumbs: [
      { title: "문서" },
      { title: "사업계획", path: "/kanban/documents/business-plan" },
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

const histories = [
  {
    id: "1",
    user: "관리자",
    target: "어르신 상담",
    action: "카드 제목을 수정했습니다.",
    date: "2026-05-17 17:30",
    canRestore: true,
    before: { title: "어르신 상담 초안", column: "실적관리" },
    after: { title: "어르신 상담", column: "실적관리" },
  },
  {
    id: "2",
    user: "김영수",
    target: "프로그램 기획",
    action: "카드를 이동했습니다.",
    date: "2026-05-17 16:12",
    canRestore: true,
    before: { column: "실적관리", position: 1 },
    after: { column: "사업계획", position: 0 },
  },
  {
    id: "3",
    user: "이승현",
    target: "만족도 설문 작성",
    action: "카드 설명을 수정했습니다.",
    date: "2026-05-17 15:40",
    canRestore: false,
    before: { description: "설문 초안" },
    after: { description: "설문지 초안 작성" },
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
  return pageLinks.find((page) => matchPath(pathname, page.path)) ?? pageLinks[0]
}

function getBreadcrumbs(currentPage: PageLink): BreadcrumbItem[] {
  return [
    { title: "산하기관" },
    { title: "춘천북부노인복지관" },
    ...(currentPage.breadcrumbs ?? [
      {
        title: currentPage.title,
        path: currentPage.path,
      },
    ]),
  ]
}

export function Header() {
  const pathname = usePathname()

  const currentPage = useMemo(() => getCurrentPage(pathname), [pathname])
  const breadcrumbs = useMemo(() => getBreadcrumbs(currentPage), [currentPage])

  const isKanbanPage = pathname === "/kanban"
  const isAdmin = true

  return (
    <header className="border-b border-border bg-card">
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
        
        {/* 버전기록 시트 */}
        {isKanbanPage && (
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <GitBranch className="size-4" />
                버전 기록
              </button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[460px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>버전 기록</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-3">
                {histories.map((history) => (
                  <details
                    key={history.id}
                    className="rounded-xl border bg-background p-4"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {history.user}님이 {history.target} {history.action}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {history.date}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Eye className="size-3" />
                        미리 보기
                      </div>
                    </summary>

                    <div className="mt-4 space-y-4 border-t pt-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">
                          변경 전
                        </p>

                        <pre className="rounded-lg bg-muted p-3 text-xs">
                          {JSON.stringify(history.before, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">
                          변경 후
                        </p>

                        <pre className="rounded-lg bg-muted p-3 text-xs">
                          {JSON.stringify(history.after, null, 2)}
                        </pre>
                      </div>

                      {isAdmin && history.canRestore ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full gap-2"
                        >
                          <RotateCcw className="size-4" />
                          이 시점으로 되돌리기
                        </Button>
                      ) : null}
                    </div>
                  </details>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  )
}