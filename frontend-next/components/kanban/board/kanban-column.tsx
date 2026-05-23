"use client"

import { Plus } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  ColumnType,
  ProjectImageOption,
  Staff,
  Task,
} from "@/services/kanban.board.types"
import { TaskFormData } from "./task-modal"
import { TaskCard } from "./task-card"


interface KanbanColumnProps {
  id: string
  title: string
  count: number
  tasks: Task[]
  color?: string
  columnType?: ColumnType
  projectId?: string
  projectName?: string
  staffList?: Staff[]
  projectImages?: ProjectImageOption[]
  year?: string
  onAddTask?: (categoryId: string, columnType: ColumnType) => void
  onUpdateTask?: (
    categoryId: string,
    taskId: string,
    data: TaskFormData
  ) => Promise<void>
  onDeleteTask?: (categoryId: string, taskId: string) => Promise<void>
}

function resolveColumnType(title: string, columnType?: ColumnType): ColumnType {
  if (columnType) return columnType

  const normalizedTitle = title.replaceAll(" ", "").trim()

  if (normalizedTitle === "실적관리") return "실적관리"
  if (normalizedTitle === "사업계획" || normalizedTitle === "사업계획서") {
    return "사업계획"
  }
  if (normalizedTitle === "만족도조사") return "만족도조사"
  if (normalizedTitle === "사업평가") return "사업평가"

  return "실적관리"
}

export function KanbanColumn({
  id,
  title,
  count,
  tasks,
  color = "bg-primary",
  columnType,
  projectId,
  projectName,
  staffList,
  projectImages,
  year,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: KanbanColumnProps) {
  const resolvedColumnType = resolveColumnType(title, columnType)

  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "column",
      columnId: id,
      columnType: resolvedColumnType,
    },
  })

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${color}`} />
          <h3 className="font-medium text-foreground">{title}</h3>
          <span className="text-sm text-muted-foreground">+{count}</span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[140px] flex-1 flex-col gap-3 rounded-xl p-2 transition-colors ${
          isOver ? "bg-primary/10 ring-2 ring-primary/30" : ""
        }`}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
            key={task.id}
            task={task}
            columnType={resolvedColumnType}
            projectId={projectId}
            projectName={projectName}
            categoryId={id}
            staffList={staffList}
            projectImages={projectImages}
            year={year}
            onAddTask={
              onAddTask
                ? () => onAddTask(id, resolvedColumnType)
                : undefined
            }
            onUpdateTask={
              onUpdateTask
                ? (data) => onUpdateTask(id, task.id, data)
                : undefined
            }
            onDeleteTask={
              onDeleteTask
                ? () => onDeleteTask(id, task.id)
                : undefined
            }
          />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            여기에 업무를 놓으세요
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAddTask?.(id, resolvedColumnType)}
        className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-4" />
        <span>업무 추가</span>
      </button>
    </div>
  )
}