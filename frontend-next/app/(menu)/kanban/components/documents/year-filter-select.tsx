"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getCurrentYearString,
  getYearSelectOptions,
} from "@/lib/current-year"

type YearFilterSelectProps = {
  className?: string
}

export function YearFilterSelect({ className }: YearFilterSelectProps) {
  const currentYear = getCurrentYearString()
  const options = getYearSelectOptions(1, 0)

  return (
    <Select defaultValue={currentYear}>
      <SelectTrigger className={className ?? "w-28"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((year) => (
          <SelectItem key={year} value={year}>
            {year}년
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
