"use client"

import { Calendar } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface YearFilterControlProps {
  value: string | null
  yearOptions: string[]
  onChange: (year: string | null) => void
}

/** 업무가 속한 사업 연도로 업무 폴더를 필터링 */
export function YearFilterControl({
  value,
  yearOptions,
  onChange,
}: YearFilterControlProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="size-4 shrink-0 text-muted-foreground" />
      <Select
        value={value ?? "all"}
        onValueChange={(next) => onChange(next === "all" ? null : next)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="연도" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 연도</SelectItem>
          {yearOptions.map((year) => (
            <SelectItem key={year} value={year}>
              {year}년
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
