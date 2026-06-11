"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, LogOut, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandLogo } from "@common/components/brand-logo"
import { useAuth } from "@common/components/auth-provider"
import { EmployeeAvatar } from "@common/components/employee-avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { APP_MENU_ITEMS, MENU_MANAGEMENT_HREF } from "@/config/menu"
import {
  getHiddenMenuHrefs,
  MENU_PREFERENCES_EVENT,
} from "@/config/menu-preferences"

/** 사업계획서·사업평가 작성 화면 — 넓은 문서 영역을 위해 기본 접힘 */
function shouldCollapseSidebarByDefault(pathname: string) {
  return (
    /\/kanban\/task\/[^/]+\/business-plan(?:\/|$)/.test(pathname) ||
    /\/kanban\/task\/[^/]+\/evaluation(?:\/|$)/.test(pathname)
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { session, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(() =>
    shouldCollapseSidebarByDefault(pathname),
  )
  const [hiddenHrefs, setHiddenHrefs] = useState<string[]>([])

  const profileUser = session
    ? {
        name: session.name,
        role: session.role,
        department: session.department,
        profileImage: session.profileImage,
      }
    : null

  const isAdmin = session?.roleType === "admin"

  const visibleMenuItems = useMemo(
    () =>
      APP_MENU_ITEMS.filter((item) => {
        if (item.href === "#") return true
        // 메뉴 관리는 관리자만 사이드바에 노출
        if (item.href === MENU_MANAGEMENT_HREF) return isAdmin
        return !hiddenHrefs.includes(item.href)
      }),
    [hiddenHrefs, isAdmin],
  )

  useEffect(() => {
    setCollapsed(shouldCollapseSidebarByDefault(pathname))
  }, [pathname])

  useEffect(() => {
    setHiddenHrefs(getHiddenMenuHrefs())
    const sync = () => setHiddenHrefs(getHiddenMenuHrefs())
    window.addEventListener(MENU_PREFERENCES_EVENT, sync)
    return () => window.removeEventListener(MENU_PREFERENCES_EVENT, sync)
  }, [])

  return (
    <aside
      data-app-sidebar
      className={cn(
        "print-hide sticky top-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden",
        "border-r border-sidebar-border bg-sidebar",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border px-3",
          collapsed ? "h-[4.5rem] justify-center" : "h-20 justify-between gap-2 px-4",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex min-w-0 items-center overflow-hidden",
            collapsed ? "justify-center" : "flex-1",
          )}
          title="대시보드"
        >
          <BrandLogo size={collapsed ? "sm" : "md"} />
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent",
            collapsed && "absolute right-2 top-4",
          )}
        >
          <ChevronLeft
            className={cn(
              "size-5 text-sidebar-foreground transition-transform",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      <div className={cn("border-b border-sidebar-border p-4", collapsed && "px-3")}>
        <Link
          href={MENU_MANAGEMENT_HREF}
          title="메뉴 관리"
          className={cn(
            "block overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 transition-opacity hover:opacity-90",
            collapsed ? "p-2" : "p-4",
          )}
        >
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
            {profileUser && (
              <>
                <div className="relative shrink-0">
                  <EmployeeAvatar
                    key={session?.profileImage ?? session?.id}
                    employee={profileUser}
                    className={cn(
                      "border-2 border-card",
                      collapsed ? "size-10" : "size-12",
                    )}
                    fallbackClassName={collapsed ? "text-sm" : "text-base"}
                    imageCacheKey={session?.profileImage}
                  />
                  <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-success" />
                </div>

                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sidebar-foreground">
                      {profileUser.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        {profileUser.role}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {profileUser.department}
                    </p>
                    {session?.regionLabel && (
                      <p className="truncate text-[10px] text-primary">
                        {session.orgName} · {session.regionLabel}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Link>
      </div>

      {!collapsed && (
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Quick Menu Search..."
              className="bg-sidebar-accent pl-9 text-sm"
            />
          </div>
        </div>
      )}

      <nav className={cn("flex-1 space-y-1 overflow-y-auto py-2", collapsed ? "px-3" : "px-3")}>
        {visibleMenuItems.map((item) => {
          const isActive =
            item.href !== "#" &&
            (pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href === "/automation" && pathname.startsWith("/survey")) ||
              (item.href === MENU_MANAGEMENT_HREF &&
                pathname.startsWith("/settings")))

          const Icon = item.icon
          const isDisabled = item.href === "#"

          if (isDisabled) {
            return (
              <span
                key={item.label}
                title={collapsed ? item.label : "준비 중"}
                className={cn(
                  "flex min-w-0 cursor-not-allowed items-center rounded-lg text-sm text-muted-foreground/60",
                  collapsed ? "h-11 justify-center px-0" : "gap-3 px-3 py-2.5",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
              </span>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex min-w-0 items-center rounded-lg text-sm transition-colors",
                collapsed ? "h-11 justify-center px-0" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className={cn("w-full text-muted-foreground", !collapsed && "justify-start gap-2")}
          onClick={() => void logout()}
        >
          <LogOut className="size-4" />
          {!collapsed && <span>로그아웃</span>}
        </Button>
      </div>
    </aside>
  )
}
