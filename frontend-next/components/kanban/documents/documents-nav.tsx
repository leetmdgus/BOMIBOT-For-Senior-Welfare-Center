"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  FileText,
  DollarSign,
  ClipboardList,
  FileSpreadsheet,
  Printer,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const navItems = [
  {
    href: "/kanban/documents/performance",
    label: "실적 보고서",
    icon: FileText,
  },
  {
    href: "/kanban/documents/budget",
    label: "예산 보고서",
    icon: DollarSign,
  },
  {
    href: "/kanban/documents/business-plan",
    label: "사업계획서",
    icon: ClipboardList,
  },
]

export function DocumentsNav() {
  const pathname = usePathname()
  const isBusinessPlan = pathname.includes("/business-plan")

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isBusinessPlan ? "2026년 통합 사업계획서" : "사업문서"}
        </h2>

        <div className="flex items-center gap-2">
          <Link href="/kanban">
            <Button variant="outline" size="sm" className="gap-2">
              <Home className="size-4" />
              사업관리
            </Button>
          </Link>

          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href

            return (
              <Button
                key={item.href}
                asChild
                variant={active ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <Link href={item.href}>
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </Button>
            )
          })}

          {isBusinessPlan && (
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="size-4" />
              인쇄
            </Button>
          )}

          <Button variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="size-4" />
            엑셀 저장
          </Button>
        </div>
      </div>
    </>
  )
}