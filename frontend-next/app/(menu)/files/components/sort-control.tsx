"use client"

import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { SortKey } from "@common/types/file-types"

const sortLabels: Record<SortKey, string> = {
  name: "이름 차순",
  modified: "최신 수정순",
  created: "최신 생성순",
}

interface SortControlProps {
  value: SortKey
  onChange: (value: SortKey) => void
}

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {sortLabels[value]}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onChange("name")}>이름 차순</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("modified")}>최신 수정순</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("created")}>최신 생성순</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
