"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  FolderOpen,
  FileSignature,
  BookOpen,
  Settings,
  Search,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"

interface MenuItem {
  icon: React.ElementType
  label: string
  href: string
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "대시보드", href: "/dashboard" },
  { icon: Users, label: "조직현황", href: "/organization" },
  { icon: Briefcase, label: "사업관리", href: "/kanban" },
  { icon: FileText, label: "문서자동화", href: "/automation" },
  { icon: FolderOpen, label: "파일들", href: "/files" },
  { icon: BookOpen, label: "전자책자", href: "/ebooks" },
  { icon: FileSignature, label: "전자결재", href: "#" },
  { icon: Settings, label: "메뉴 관리", href: "#" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      data-app-sidebar
      className={cn(
        "print-hide sticky top-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden",
        "border-r border-sidebar-border bg-sidebar",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex min-w-0 items-center overflow-hidden",
            collapsed ? "w-8 justify-center" : "flex-1"
          )}
          title="대시보드"
        >
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-rb6uhcZGZoHFd5DD3c4Dkk5xROg0xC.png"
            alt="봄이봇"
            className="h-8 w-auto shrink-0 object-contain"
          />
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent",
            collapsed && "absolute right-2 top-4"
          )}
        >
          <ChevronLeft
            className={cn(
              "size-5 text-sidebar-foreground transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      <div className={cn("border-b border-sidebar-border p-4", collapsed && "px-3")}>
        <div
          className={cn(
            "overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5",
            collapsed ? "p-2" : "p-4"
          )}
        >
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
            <div className="relative shrink-0">
              <Avatar className={cn("border-2 border-card", collapsed ? "size-10" : "size-12")}>
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  이
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-success" />
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sidebar-foreground">이승현</p>
                <p className="truncate text-xs text-muted-foreground">사회복지사</p>
              </div>
            )}
          </div>
        </div>
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
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.href === "/automation" && pathname.startsWith("/survey"))

          const Icon = item.icon

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
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className={collapsed ? "sr-only" : "truncate"}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}