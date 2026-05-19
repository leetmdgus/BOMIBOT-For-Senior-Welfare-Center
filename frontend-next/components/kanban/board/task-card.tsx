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
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { CSS } from "@dnd-kit/utilities"
import { useSortable } from "@dnd-kit/sortable"

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
import { TaskModal, type TaskFormData } from "./task-modal"

import {
  ColumnType,
  ProjectImageOption,
  Staff,
  Task,
} from "@/services/kanban.board.types"

interface TaskCardProps {
  task: Task
  isDragging?: boolean
  columnType?: ColumnType
  projectId?: string
  projectName?: string
  categoryId?: string
  staffList?: Staff[]
  projectImages?: ProjectImageOption[]
  year?: string

  onAddTask?: () => void

  onUpdateTask?: (
    data: TaskFormData
  ) => Promise<void>

  onDeleteTask?: () => Promise<void>
}

const taskPathMap: Record<ColumnType, string> = {
  실적관리: "performance",
  사업계획: "business-plan",
  만족도조사: "survey",
  사업평가: "evaluation",
}

function getTaskDetailPath(
  taskId: string,
  columnType?: ColumnType
) {
  if (!columnType) return `/kanban/task/${taskId}`

  return `/kanban/task/${taskId}/${taskPathMap[columnType]}`
}

export function TaskCard({
  task,
  isDragging,
  columnType,
  projectId,
  projectName,
  categoryId,
  staffList,
  projectImages,
  year,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: TaskCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasProgress =
    task.completedCount !== undefined &&
    task.totalCount !== undefined

  const isCompleted =
    hasProgress &&
    task.totalCount! > 0 &&
    task.completedCount! >= task.totalCount!

  const detailPath = getTaskDetailPath(task.id, columnType)

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "group cursor-grab touch-none rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing",
          isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
        )}
      >
        <div className="mb-2 flex items-start gap-2">
          <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-100" />

          <Link
            href={detailPath}
            className="group/title flex min-w-0 flex-1 items-start"
          >
            <div className="flex min-w-0 items-start gap-1.5">
              {isCompleted && (
                <div className="mt-[2px] shrink-0">
                  <CheckCircle2 className="size-4 fill-emerald-500 text-white drop-shadow-sm" />
                </div>
              )}

              <h4 className="line-clamp-2 break-words text-[14px] font-semibold leading-5 tracking-[-0.01em] text-card-foreground transition-colors group-hover/title:text-primary">
                {task.title}
              </h4>
            </div>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 opacity-100"
              onClick={(event) => {
                event.stopPropagation()
                setIsEditModalOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 opacity-100"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/kanban/task/${task.id}/performance`}>
                    <BarChart3 className="mr-2 size-4" />
                    실적관리
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href={`/kanban/task/${task.id}/business-plan`}>
                    <ClipboardList className="mr-2 size-4" />
                    사업계획
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href={`/kanban/task/${task.id}/survey`}>
                    <MessageSquareText className="mr-2 size-4" />
                    만족도조사
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href={`/kanban/task/${task.id}/evaluation`}>
                    <BadgeCheck className="mr-2 size-4" />
                    사업평가
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "업무를 삭제하시겠습니까?"
                    )

                    if (!confirmed) return

                    await onDeleteTask?.()
                  }}
                >
                  <Trash2 className="mr-2 size-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="flex min-w-0 cursor-context-menu items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-muted">
                <span className="shrink-0 text-primary">
                  ✽
                </span>

                <span className="truncate">
                  복지 1팀 {task.assignee} 사회복지사
                </span>
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

              <ContextMenuItem>
                복지팀 김연수 사회복지사
              </ContextMenuItem>

              <ContextMenuItem>
                복지팀 김태민 사회복지사
              </ContextMenuItem>

              <ContextMenuItem>
                복지팀 박수현 사회복지사
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
      
      <TaskModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        mode="edit"
        task={task}
        columnType={columnType}
        defaultProjectId={projectId}
        defaultCategoryId={categoryId}
        defaultProjectName={projectName}
        lockProjectSelect
        year={year}
        staffList={staffList}
        projectImages={projectImages}
        onSubmit={async (data) => {
          await onUpdateTask?.(data)
          setIsEditModalOpen(false)
        }}
        onDelete={async () => {
          await onDeleteTask?.()
          setIsEditModalOpen(false)
        }}
      />
    </>
  )
}