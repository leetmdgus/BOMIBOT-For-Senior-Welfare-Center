"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  GripVertical,
  MessageSquareText,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import { CSS } from "@dnd-kit/utilities"
import { useSortable } from "@dnd-kit/sortable"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { TaskModal } from "./task-modal"

export type ColumnType =
  | "실적관리"
  | "사업계획"
  | "만족도조사"
  | "사업평가"

export interface Task {
  id: string
  title: string
  description: string
  priority: "HIGH" | "MEDIUM" | "LOW"
  assignee: string
  progressCount: string
  completedCount?: number
  totalCount?: number
}

interface TaskCardProps {
  task: Task
  isDragging?: boolean
  columnType?: ColumnType
}

const taskPathMap: Record<ColumnType, string> = {
  실적관리: "performance",
  사업계획: "business-plan",
  만족도조사: "survey",
  사업평가: "evaluation",
}

function getTaskDetailPath(taskId: string, columnType?: ColumnType) {
  if (!columnType) return `/task/${taskId}`
  return `/task/${taskId}/${taskPathMap[columnType]}`
}

export function TaskCard({ task, isDragging, columnType }: TaskCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityStyles = {
    HIGH: "bg-priority-high text-white",
    MEDIUM: "bg-priority-medium text-accent-foreground",
    LOW: "bg-muted text-muted-foreground",
  }

  const hasProgress =
    task.completedCount !== undefined && task.totalCount !== undefined

  const progressPercent = hasProgress
    ? (task.completedCount! / task.totalCount!) * 100
    : 0

  const detailPath = getTaskDetailPath(task.id, columnType)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group cursor-grab touch-none rounded-lg border border-border bg-card p-2.5 shadow-sm transition-all hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
      )}
    >
      <div className="mb-1.5 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />

          <Badge
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-semibold",
              priorityStyles[task.priority]
            )}
          >
            {task.priority}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/task/${task.id}/performance`}>
                <BarChart3 className="mr-2 size-4" />
                실적관리
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={`/task/${task.id}/business-plan`}>
                <ClipboardList className="mr-2 size-4" />
                사업계획
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={`/task/${task.id}/survey`}>
                <MessageSquareText className="mr-2 size-4" />
                만족도조사
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={`/task/${task.id}/evaluation`}>
                <BadgeCheck className="mr-2 size-4" />
                사업평가
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 size-4" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link
        href={detailPath}
        className="block"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h4 className="line-clamp-1 cursor-pointer text-sm font-medium text-card-foreground transition-colors hover:text-primary">
          {task.title}
        </h4>
      </Link>

      {hasProgress && (
        <div className="mb-1.5 mt-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="size-3 text-success" />
              <span>월 진행률</span>
            </div>

            <span className="font-medium text-foreground">
              {task.completedCount}/{task.totalCount}
            </span>
          </div>

          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-success transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className="flex cursor-context-menu items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-muted"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <span className="text-primary">✽</span>
              <span>{task.assignee}</span>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-64">
            <ContextMenuItem className="justify-center text-destructive">
              담당자 삭제
            </ContextMenuItem>

            <ContextMenuSeparator />

            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              담당자 변경
            </div>

            <ContextMenuSeparator />

            <ContextMenuItem>복지팀 김연수 사회복지사</ContextMenuItem>
            <ContextMenuItem>복지팀 김태민 사회복지사</ContextMenuItem>
            <ContextMenuItem>복지팀 박수현 사회복지사</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <div className="flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          <span>{task.progressCount}</span>
        </div>
      </div>

      <TaskModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        mode="edit"
        task={task}
        columnType={columnType}
      />
    </div>
  )
}