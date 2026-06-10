"use client"

import { useState } from "react"
import {
  ChevronDown,
  Grid3X3,
  List,
  Plus,
  Search,
  Settings,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useAuth } from "@/components/auth/auth-provider"
import { cn } from "@/lib/utils"

import {
  Category,
  ViewMode,
} from "@/services/ebooks.types"
import { EbookUploadDialog } from "./ebook-upload-dialog"

interface EbooksToolbarProps {
  categories: Category[]
  selectedCategory: Category
  viewMode: ViewMode
  sortBy: string
  searchQuery: string
  onCategoryChange: (category: Category) => void
  onViewModeChange: (mode: ViewMode) => void
  onSortChange: (value: string) => void
  onSearchChange: (value: string) => void
  /** 신규 도서 등록 성공 시 — 목록 새로고침 */
  onRegistered: () => void
}

export function EbooksToolbar({
  categories,
  selectedCategory,
  viewMode,
  sortBy,
  searchQuery,
  onCategoryChange,
  onViewModeChange,
  onSortChange,
  onSearchChange,
  onRegistered,
}: EbooksToolbarProps) {
  const { session } = useAuth()
  const orgName = session?.orgName ?? "복지관"
  const [registerOpen, setRegisterOpen] = useState(false)

  return (
    <>
      <header className="mb-6 flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">
            연간 보고서
          </h1>

          <p className="text-sm text-muted-foreground">
            산하기관 &gt; {orgName}
            &gt; 연간 보고서
          </p>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Button
          className="bg-[#1a2744] text-white hover:bg-[#1a2744]/90"
          onClick={() => setRegisterOpen(true)}
        >
          <Plus className="mr-2 size-4" />
          신규 도서 등록
        </Button>

        <EbookUploadDialog
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          onRegistered={onRegistered}
        />

        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() =>
                onCategoryChange(category)
              }
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                selectedCategory === category
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <button
              onClick={() =>
                onViewModeChange("grid")
              }
              className={cn(
                "rounded p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid3X3 className="size-4" />
            </button>

            <button
              onClick={() =>
                onViewModeChange("list")
              }
              className={cn(
                "rounded p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="size-4" />
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
              >
                SORT

                <span className="font-medium">
                  {sortBy}
                </span>

                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  onSortChange("최신순")
                }
              >
                최신순
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  onSortChange("오래된순")
                }
              >
                오래된순
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  onSortChange("이름순")
                }
              >
                이름순
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="도서명 또는 발행부서 검색..."
              value={searchQuery}
              onChange={(e) =>
                onSearchChange(e.target.value)
              }
              className="w-64 pl-9"
            />
          </div>

          <Button variant="ghost" size="icon">
            <Settings className="size-5" />
          </Button>
        </div>
      </div>
    </>
  )
}