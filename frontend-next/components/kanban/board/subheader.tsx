"use client"

import { useState } from "react"
import Link from "next/link"

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

import { TaskModal, type TaskFormData } from "./task-modal"

interface HeaderProps {
  year: string
  onYearChange: (year: string) => void
  onCreateProject: (data: TaskFormData) => void | Promise<void>
}

export function SubHeader({
  year,
  onYearChange,
  onCreateProject,
}: HeaderProps) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

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
                <Link href="/kanban/documents/performance">실적보고서</Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/kanban/documents/budget">예산보고서</Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/kanban/documents/business-plan">사업계획서</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TaskModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        formType="newProject"
        columnType="실적관리"
        onSubmit={async (data) => {
          await onCreateProject(data)
          setIsTaskModalOpen(false)
        }}
      />
    </header>
  )
}