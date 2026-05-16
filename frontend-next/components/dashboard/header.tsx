"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Menu,
  Settings,
  HelpCircle,
  Smartphone,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProjectModal } from "./project-modal"

interface HeaderProps {
  year: string
  onYearChange: (year: string) => void
}

export function Header({ year, onYearChange }: HeaderProps) {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  return (
    <header className="border-b border-border bg-card">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold">사업관리</h1>
              <p className="text-sm text-muted-foreground">
                산하기관 &gt; 춘천북부노인복지관 &gt; 사업관리
              </p>
            </div>
          </div>
        </header>

      {/* Year & Search */}
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
            onClick={() => setIsProjectModalOpen(true)}
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
                <Link href="/documents/performance">
                  실적보고서
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/documents/budget">
                  예산보고서
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/documents/business-plan">
                  사업계획서
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ProjectModal
        open={isProjectModalOpen}
        onOpenChange={setIsProjectModalOpen}
      />
    </header>
  )
}
