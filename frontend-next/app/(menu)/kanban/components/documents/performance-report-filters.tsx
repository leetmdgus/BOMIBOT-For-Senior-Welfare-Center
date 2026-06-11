"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { YearFilterSelect } from "@menu/kanban/components/documents/year-filter-select"

export function PerformanceReportFilters() {
  return (
    <div className="flex items-center gap-4">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">연도</label>
        <YearFilterSelect />
      </div>

      <div className="flex-1">
        <label className="mb-1 block text-xs text-muted-foreground">
          사업명 검색
        </label>
        <Input placeholder="사업명, 세부사업" className="w-80" />
      </div>

      <div className="flex items-end gap-2">
        <Button>조회</Button>
        <Button variant="outline">초기화</Button>
      </div>
    </div>
  )
}
