"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import {
  ChevronUp,
  LayoutGrid,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react"

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { ApiError } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { TaskFormData, TaskModal } from "./task-modal"
import { KanbanColumn } from "./kanban-column"
import { TaskCard } from "./task-card"
import {
  Category,
  ColumnType,
  KanbanProject,
  ProjectImageOption,
  Staff,
  Task,
} from "@/services/kanban.board.types"
import { getCurrentYearString } from "@/lib/current-year"
import { resolveColumnTypeForCategoryTitle } from "@/lib/kanban/static-config"
import {
  deleteProject,
  deleteTask,
  moveTask,
  updateTask,
} from "@/services/kanban.board.service"

interface ProjectSectionProps {
  project: KanbanProject
  year?: string
  staffList?: Staff[]
  projectImages?: ProjectImageOption[]
  onRefresh?: () => Promise<void>
  /** 카드 이동 후 전체 로딩 없이 서버 동기화 */
  onRefreshSilent?: () => Promise<void>
  onProjectCategoriesChange?: (
    projectId: string,
    categories: Category[],
  ) => void
  onCreateTask: (
    projectId: string,
    categoryId: string,
    data: TaskFormData
  ) => Promise<void>
  onEditProject: () => void
}

export function ProjectSection({
  project,
  year = getCurrentYearString(),
  staffList,
  projectImages,
  onRefresh,
  onRefreshSilent,
  onProjectCategoriesChange,
  onCreateTask,
  onEditProject,
}: ProjectSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const [projectTitle, setProjectTitle] = useState(project.title ?? "")
  const [projectImage, setProjectImage] = useState<string | undefined>(
    project.image
  )

  const [taskModalOpen, setTaskModalOpen] = useState(false)

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  )
  const [selectedColumnType, setSelectedColumnType] =
    useState<ColumnType>("실적관리")

  const [categories, setCategories] = useState<Category[]>(project.categories)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dragFromCategoryId, setDragFromCategoryId] = useState<string | null>(
    null,
  )
  const [activeColumnType, setActiveColumnType] =
    useState<ColumnType>("실적관리")
  const [columnTypeMap, setColumnTypeMap] = useState<Record<string, ColumnType>>(
    {}
  )

  useEffect(() => {
    setProjectTitle(project.title ?? "")
    setProjectImage(project.image)
  }, [project.title, project.image])

  useEffect(() => {
    setCategories(project.categories)
  }, [project.categories])

  useEffect(() => {
    const map = Object.fromEntries(
      project.categories.map((category) => [
        category.id,
        resolveColumnTypeForCategoryTitle(category.title),
      ]),
    )
    setColumnTypeMap(map)
  }, [project.categories])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const findCategoryByTaskId = useCallback(
    (taskId: string) => {
      return categories.find((category) =>
        category.tasks.some((task) => task.id === taskId)
      )
    },
    [categories]
  )

  const handleDeleteProject = async () => {
    const confirmed = window.confirm("프로젝트를 삭제하시겠습니까?")

    if (!confirmed) return

    try {
      const deleted = await deleteProject(project.id)

      if (!deleted) return

      await onRefresh?.()
    } catch (error) {
      console.error("프로젝트 삭제 실패:", error)
    }
  }

  const handleUpdateTask = async (
    categoryId: string,
    taskId: string,
    data: TaskFormData
  ) => {
    try {
      const sourceCategory = categories.find(
        (category) => category.id === categoryId
      )

      const currentTask = sourceCategory?.tasks.find(
        (task) => task.id === taskId
      )

      if (!currentTask) return

      const updatedTask: Task = {
        ...currentTask,
        title: data.title,
        description: data.description ?? "",
        assignee: data.assignees?.[0]?.name ?? currentTask.assignee,
      }

      await updateTask(project.id, categoryId, taskId, updatedTask)

      setCategories((prev) =>
        prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                tasks: category.tasks.map((task) =>
                  task.id === taskId ? updatedTask : task
                ),
              }
            : category
        )
      )

    } catch (error) {
      console.error("업무 수정 실패:", error)
      setCategories(project.categories)
      onProjectCategoriesChange?.(project.id, project.categories)
    }
  }

  const handleDeleteTask = async (categoryId: string, taskId: string) => {
    try {
      await deleteTask(project.id, categoryId, taskId)

      setCategories((prev) =>
        prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                tasks: category.tasks.filter((task) => task.id !== taskId),
              }
            : category
        )
      )
    } catch (error) {
      console.error("업무 삭제 실패:", error)
    }
  }

  const openTaskModal = (categoryId?: string, columnType?: ColumnType) => {
    setSelectedCategoryId(categoryId ?? null)
    setSelectedColumnType(columnType ?? "실적관리")
    setTaskModalOpen(true)
  }

  const resetDragCursor = () => {
    document.body.style.cursor = ""
  }

  const handleDragStart = (event: DragStartEvent) => {
    document.body.style.cursor = "grabbing"

    const activeId = event.active.id as string
    const category = findCategoryByTaskId(activeId)

    if (!category) return

    const task = category.tasks.find((item) => item.id === activeId)

    if (!task) return

    setActiveTask(task)
    setDragFromCategoryId(category.id)
    setActiveColumnType(columnTypeMap[category.id] ?? "실적관리")
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeCategory = findCategoryByTaskId(activeId)
    const overCategory =
      findCategoryByTaskId(overId) ||
      categories.find((category) => category.id === overId)

    if (!activeCategory || !overCategory) return
    if (activeCategory.id === overCategory.id) return

    setCategories((prevCategories) => {
      const movingTask = activeCategory.tasks.find(
        (task) => task.id === activeId
      )

      if (!movingTask) return prevCategories

      return prevCategories.map((category) => {
        if (category.id === activeCategory.id) {
          return {
            ...category,
            tasks: category.tasks.filter((task) => task.id !== activeId),
          }
        }

        if (category.id === overCategory.id) {
          const overTaskIndex = category.tasks.findIndex(
            (task) => task.id === overId
          )

          const nextTasks = [...category.tasks]

          if (overTaskIndex >= 0) {
            nextTasks.splice(overTaskIndex, 0, movingTask)
          } else {
            nextTasks.push(movingTask)
          }

          return {
            ...category,
            tasks: nextTasks,
          }
        }

        return category
      })
    })
  }

  const applyCategoriesMove = useCallback(
    (
      prev: Category[],
      activeId: string,
      fromCategoryId: string,
      overCategory: Category,
      overId: string,
    ): Category[] => {
      const movingTask = prev
        .flatMap((category) => category.tasks)
        .find((task) => task.id === activeId)

      if (!movingTask) return prev

      const insertBeforeTaskId = overCategory.tasks.some(
        (task) => task.id === overId,
      )
        ? overId
        : undefined

      return prev.map((category) => {
        if (category.id === fromCategoryId) {
          return {
            ...category,
            tasks: category.tasks.filter((task) => task.id !== activeId),
          }
        }

        if (category.id === overCategory.id) {
          const without = category.tasks.filter((task) => task.id !== activeId)
          const nextTasks = [...without]

          if (insertBeforeTaskId) {
            const overIndex = nextTasks.findIndex(
              (task) => task.id === insertBeforeTaskId,
            )
            if (overIndex >= 0) {
              nextTasks.splice(overIndex, 0, movingTask)
            } else {
              nextTasks.push(movingTask)
            }
          } else {
            nextTasks.push(movingTask)
          }

          return { ...category, tasks: nextTasks }
        }

        return category
      })
    },
    [],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    resetDragCursor()

    const { active, over } = event

    setActiveTask(null)

    if (!over) {
      setDragFromCategoryId(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) {
      setDragFromCategoryId(null)
      return
    }

    const overCategory =
      findCategoryByTaskId(overId) ||
      categories.find((category) => category.id === overId)

    const fromCategoryId = dragFromCategoryId ?? findCategoryByTaskId(activeId)?.id

    setDragFromCategoryId(null)

    if (!overCategory || !fromCategoryId) return

    const overTaskId = overCategory.tasks.some((task) => task.id === overId)
      ? overId
      : undefined

    let nextCategories = categories

    if (fromCategoryId === overCategory.id) {
      const column = categories.find((category) => category.id === fromCategoryId)
      if (!column) return

      const oldIndex = column.tasks.findIndex((task) => task.id === activeId)
      const newIndex = column.tasks.findIndex((task) => task.id === overId)

      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

      nextCategories = categories.map((category) => {
        if (category.id !== fromCategoryId) return category

        return {
          ...category,
          tasks: arrayMove(category.tasks, oldIndex, newIndex),
        }
      })
    } else {
      const taskStillInSource = categories
        .find((category) => category.id === fromCategoryId)
        ?.tasks.some((task) => task.id === activeId)

      if (taskStillInSource) {
        nextCategories = applyCategoriesMove(
          categories,
          activeId,
          fromCategoryId,
          overCategory,
          overId,
        )
      }
    }

    setCategories(nextCategories)
    onProjectCategoriesChange?.(project.id, nextCategories)

    void moveTask(project.id, {
      taskId: activeId,
      fromCategoryId,
      toCategoryId: overCategory.id,
      overTaskId,
    })
      .then(() => onRefreshSilent?.())
      .catch((error) => {
        console.error("카드 이동 저장 실패:", error)
        setCategories(project.categories)
        onProjectCategoriesChange?.(project.id, project.categories)
        const message =
          error instanceof ApiError
            ? error.message
            : "카드 위치를 서버에 저장하지 못했습니다."
        toast({
          variant: "destructive",
          title: "저장 실패",
          description: message,
        })
      })
  }

  const totalTaskCount = categories.reduce(
    (sum, category) => sum + category.tasks.length,
    0
  )

  const defaultCategoryId = categories[0]?.id

  return (
    <>
      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm transition-shadow">
              {projectImage ? (
                <Image
                  src={projectImage}
                  alt={projectTitle}
                  width={48}
                  height={48}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <LayoutGrid className="size-6 text-primary" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {projectTitle}
              </h2>

              <div className="rounded-full bg-[#a3a3a3] px-2 py-[2px] text-xs font-medium text-white">
                {totalTaskCount}건
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={() => openTaskModal(defaultCategoryId, "실적관리")}
              className="gap-1"
            >
              <Plus className="size-4" />
              추가
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="프로젝트 설정"
                >
                  <Settings className="size-4" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={onEditProject}
                  className="cursor-pointer"
                >
                  <Pencil className="mr-2 size-4" />
                  수정하기
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleDeleteProject}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  삭제하기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-xs text-muted-foreground">
              {categories.length} CATEGORIES
            </span>

            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="cursor-pointer rounded-lg p-1 hover:bg-muted"
              aria-label={expanded ? "접기" : "펼치기"}
            >
              <ChevronUp
                className={cn(
                  "size-5 text-muted-foreground transition-transform",
                  !expanded && "rotate-180"
                )}
              />
            </button>
          </div>
        </div>

        {expanded && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={resetDragCursor}
          >
            <div className="kanban-board-columns grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => {
                const columnType = columnTypeMap[category.id] ?? "실적관리"

                return (
                  <KanbanColumn
                    key={category.id}
                    id={category.id}
                    title={category.title}
                    count={category.tasks.length}
                    tasks={category.tasks}
                    color={category.color}
                    columnType={columnType}
                    projectId={project.id}
                    projectName={projectTitle}
                    staffList={staffList}
                    projectImages={projectImages}
                    year={year}
                    onAddTask={(categoryId, type) => {
                      openTaskModal(categoryId, type)
                    }}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                )
              })}
            </div>

            <DragOverlay>
              {activeTask && (
                <TaskCard
                  task={activeTask}
                  isDragging
                  columnType={activeColumnType}
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </section>

      <TaskModal
        open={taskModalOpen}
        onOpenChange={(open) => {
          setTaskModalOpen(open)

          if (!open) {
            setSelectedCategoryId(null)
            setSelectedColumnType("실적관리")
          }
        }}
        formType="task"
        columnType={selectedColumnType}
        year={year}
        staffList={staffList}
        projectImages={projectImages}
        defaultProjectId={project.id}
        defaultCategoryId={selectedCategoryId ?? defaultCategoryId}
        defaultProjectName={projectTitle}
        lockProjectSelect
        onSubmit={async (data) => {
          const targetCategoryId = selectedCategoryId ?? defaultCategoryId

          if (!targetCategoryId) return

          try {
            await onCreateTask(project.id, targetCategoryId, data)

            setTaskModalOpen(false)
            setSelectedCategoryId(null)
            setSelectedColumnType("실적관리")
          } catch (error) {
            console.error("업무 추가 실패:", error)
          }
        }}
      />
    </>
  )
}