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
  { icon: Briefcase, label: "사업관리", href: "/" },
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
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden",
        "border-r border-sidebar-border bg-sidebar",
        "transition-[width,transform] duration-300 ease-in-out",
        "md:sticky md:top-0",
        collapsed ? "w-16 md:w-20" : "w-[min(16rem,85vw)] md:w-64"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border p-4",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex min-w-0 items-center gap-2 overflow-hidden",
            collapsed && "justify-center"
          )}
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
            "rounded-md p-1 transition-colors hover:bg-sidebar-accent",
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

      {/* User Profile */}
      <div className="border-b border-sidebar-border p-4">
        <div
          className={cn(
            "relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-4",
            collapsed && "p-2"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed && "justify-center"
            )}
          >
            <div className="relative shrink-0">
              <Avatar className="size-12 border-2 border-card">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  이
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-success" />
            </div>

            <div
              className={cn(
                "min-w-0 flex-1 overflow-hidden transition-all duration-200",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              <p className="truncate font-medium text-sidebar-foreground">
                이승현
              </p>
              <p className="truncate text-xs text-muted-foreground">
                운영총괄 /
              </p>
              <p className="truncate text-xs text-muted-foreground">
                사회복지사
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          collapsed ? "h-0 opacity-0" : "h-auto opacity-100"
        )}
      >
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Quick Menu Search..."
              className="bg-sidebar-accent pl-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/" && pathname === "/") ||
            (item.href === "/" && pathname.startsWith("/task")) ||
            (item.href === "/automation" && pathname.startsWith("/survey")) ||
            (item.href === "/files" && pathname === "/files")

          return (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex min-w-0 items-center rounded-lg py-2.5 text-sm transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="size-5 shrink-0" />
              <span
                className={cn(
                  "min-w-0 truncate transition-all duration-200",
                  collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}