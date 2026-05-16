"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function BusinessPlanFilters() {
  return (
    <div className="flex items-center gap-4">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">연도</label>
        <Select defaultValue="2026">
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026">2026년</SelectItem>
            <SelectItem value="2025">2025년</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <label className="mb-1 block text-xs text-muted-foreground">
          사업명 검색
        </label>
        <Input placeholder="대분류, 하위분류, 세부사업명" className="w-80" />
      </div>

      <div className="flex items-end gap-2">
        <Button>조회</Button>
        <Button variant="outline">초기화</Button>
      </div>
    </div>
  )
}