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

export function PerformanceReportFilters() {
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

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          기간 구분
        </label>
        <Select defaultValue="monthly">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">월간</SelectItem>
            <SelectItem value="quarterly">분기</SelectItem>
            <SelectItem value="yearly">연간</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">보고 월</label>
        <Select defaultValue="all">
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">선택</SelectItem>
            <SelectItem value="1">1월</SelectItem>
            <SelectItem value="2">2월</SelectItem>
            <SelectItem value="3">3월</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <label className="mb-1 block text-xs text-muted-foreground">
          사업명 검색
        </label>
        <Input placeholder="사업명을 입력하세요" className="w-64" />
      </div>

      <div className="flex items-end gap-2">
        <Button>조회</Button>
        <Button variant="outline">초기화</Button>
      </div>
    </div>
  )
}