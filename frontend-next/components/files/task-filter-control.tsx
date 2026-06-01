"use client"

import { Briefcase } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { TaskOption } from "./file-types"

/** 업무 미지정 파일만 보기 */
export const TASK_FILTER_NONE = "__none__"

interface TaskFilterControlProps {
  value: string | null
  taskOptions: TaskOption[]
  onChange: (taskId: string | null) => void
}

export function TaskFilterControl({
  value,
  taskOptions,
  onChange,
}: TaskFilterControlProps) {
  const selectValue = value ?? "all"

  return (
    <div className="flex items-center gap-2">
      <Briefcase className="size-4 shrink-0 text-muted-foreground" />
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (next === "all") onChange(null)
          else onChange(next)
        }}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="업무 필터" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 업무</SelectItem>
          <SelectItem value={TASK_FILTER_NONE}>업무 미지정</SelectItem>
          {taskOptions.map((task) => (
            <SelectItem key={task.id} value={task.id}>
              {task.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
