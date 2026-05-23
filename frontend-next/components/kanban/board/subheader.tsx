"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, X } from "lucide-react"

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

import { NewProjectModal } from "./new-project-modal"
import type { TaskFormData } from "./task-modal"
import type { ProjectImageOption, Staff } from "@/services/kanban.board.types"

interface HeaderProps {
  year: string
  onYearChange: (year: string) => void
  onCreateProject: (data: TaskFormData) => void | Promise<void>
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  staffList?: Staff[]
  projectImages?: ProjectImageOption[]
}

export function SubHeader({
  year,
  onYearChange,
  onCreateProject,
  searchQuery,
  onSearchQueryChange,
  staffList,
  projectImages,
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

            <SelectContent className="z-50 bg-card text-card-foreground">
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="사업명 / 담당자 검색"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className="rounded-full bg-muted/50 pl-9 pr-9"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="검색어 지우기"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsTaskModalOpen(true)}
            className="gap-1"
          >
            <Plus className="size-4" />
            신규 사업 등록
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="link" className="text-muted-foreground">
                사업문서
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="center">
              <DropdownMenuItem asChild>
                <Link href="/kanban/documents?tab=performance">실적보고서</Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/kanban/documents?tab=budget">예산보고서</Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/kanban/documents?tab=business-plan">사업계획서</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <NewProjectModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        year={year}
        staffList={staffList}
        projectImages={projectImages}
        onSubmit={onCreateProject}
      />
    </header>
  )
}