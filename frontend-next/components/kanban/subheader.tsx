"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Eye,
  GitBranch,
  RotateCcw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { TaskModal } from "./task-modal"

interface HeaderProps {
  year: string
  onYearChange: (year: string) => void
}

const histories = [
  {
    id: "1",
    user: "관리자",
    target: "어르신 상담",
    action: "카드 제목을 수정했습니다.",
    date: "2026-05-17 17:30",
    canRestore: true,
    before: {
      title: "어르신 상담 초안",
      column: "실적관리",
    },
    after: {
      title: "어르신 상담",
      column: "실적관리",
    },
  },
  {
    id: "2",
    user: "김영수",
    target: "프로그램 기획",
    action: "카드를 이동했습니다.",
    date: "2026-05-17 16:12",
    canRestore: true,
    before: {
      column: "실적관리",
      position: 1,
    },
    after: {
      column: "사업계획",
      position: 0,
    },
  },
  {
    id: "3",
    user: "이승현",
    target: "만족도 설문 작성",
    action: "카드 설명을 수정했습니다.",
    date: "2026-05-17 15:40",
    canRestore: false,
    before: {
      description: "설문 초안",
    },
    after: {
      description: "설문지 초안 작성",
    },
  },
]

export function SubHeader({ year, onYearChange }: HeaderProps) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  const isAdmin = true

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Select value={year} onValueChange={onYearChange}>
            <SelectTrigger className="w-32 border-none bg-transparent text-3xl font-bold shadow-none">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-80">
            <Input
              placeholder="사업명 / 담당자 검색"
              className="rounded-full bg-muted/50 pl-4 pr-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="link"
            className="text-primary"
            onClick={() => setIsTaskModalOpen(true)}
          >
            + 신규사업등록
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="link" className="text-muted-foreground">
                사업문서
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="center">
              <DropdownMenuItem asChild>
                <Link href="/kanban/documents/performance">
                  실적보고서
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/kanban/documents/budget">
                  예산보고서
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/kanban/documents/business-plan">
                  사업계획서
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TaskModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        formType="newProject"
      />
    </header>
  )
}