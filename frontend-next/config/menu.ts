import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  FolderOpen,
  BookOpen,
  FileSignature,
  Settings,
} from "lucide-react"

export interface AppMenuItem {
  icon: LucideIcon
  label: string
  href: string
  /** 사이드바 숨김 설정 대상 (placeholder 링크는 false) */
  configurable?: boolean
}

export const APP_MENU_ITEMS: AppMenuItem[] = [
  { icon: LayoutDashboard, label: "대시보드", href: "/dashboard", configurable: true },
  { icon: Users, label: "조직현황", href: "/organization", configurable: true },
  { icon: Briefcase, label: "사업관리", href: "/kanban", configurable: true },
  { icon: FileText, label: "문서자동화", href: "/automation", configurable: true },
  { icon: FolderOpen, label: "파일들", href: "/files", configurable: true },
  { icon: BookOpen, label: "연간 보고서", href: "/ebooks", configurable: true },
  {
    icon: FileSignature,
    label: "전자결재",
    href: "/approvals",
    configurable: true,
  },
  {
    icon: Settings,
    label: "메뉴 관리",
    href: "/settings/menu",
    configurable: false,
  },
]

export const MENU_MANAGEMENT_HREF = "/settings/menu"
