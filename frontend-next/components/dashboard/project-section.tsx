"use client"

import { useCallback, useState } from "react"
import {
  ChevronUp,
  LayoutGrid,
  Settings,
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

import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"

import { cn } from "@/lib/utils"

import { KanbanColumn } from "./kanban-column"
import { ProjectModal } from "./project-modal"
import { TaskCard, type Task } from "./task-card"

type ColumnType =
  | "실적관리"
  | "사업계획"
  | "만족도조사"
  | "사업평가"

interface Category {
  id: string
  title: string
  color: string
  tasks: Task[]
}

interface ProjectSectionProps {
  id: string
  number: string
  title: string
  team: string
  manager: string
  categories: Category[]
}

function getColumnType(
  category: Category
): ColumnType {
  switch (category.title.trim()) {
    case "실적관리":
      return "실적관리"

    case "사업계획":
    case "사업계획서":
      return "사업계획"

    case "만족도조사":
      return "만족도조사"

    case "사업평가":
      return "사업평가"

    default:
      return "실적관리"
  }
}

export function ProjectSection({
  number,
  title,
  team,
  manager,
  categories: initialCategories,
}: ProjectSectionProps) {
  const [expanded, setExpanded] =
    useState(true)

  const [modalOpen, setModalOpen] =
    useState(false)

  const [categories, setCategories] =
    useState<Category[]>(initialCategories)

  const [activeTask, setActiveTask] =
    useState<Task | null>(null)

  const [activeColumnType, setActiveColumnType] =
    useState<ColumnType>("실적관리")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),

    useSensor(KeyboardSensor, {
      coordinateGetter:
        sortableKeyboardCoordinates,
    })
  )

  const findCategoryByTaskId = useCallback(
    (taskId: string) => {
      return categories.find((category) =>
        category.tasks.some(
          (task) => task.id === taskId
        )
      )
    },
    [categories]
  )

  const handleDragStart = (
    event: DragStartEvent
  ) => {
    const activeId = event.active.id as string

    const category =
      findCategoryByTaskId(activeId)

    if (!category) return

    const task = category.tasks.find(
      (item) => item.id === activeId
    )

    if (!task) return

    setActiveTask(task)

    setActiveColumnType(
      getColumnType(category)
    )
  }

  const handleDragOver = (
    event: DragOverEvent
  ) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeCategory =
      findCategoryByTaskId(activeId)

    const overCategory =
      findCategoryByTaskId(overId) ||
      categories.find(
        (category) => category.id === overId
      )

    if (!activeCategory || !overCategory)
      return

    if (activeCategory.id === overCategory.id)
      return

    setCategories((prevCategories) => {
      const movingTask =
        activeCategory.tasks.find(
          (task) => task.id === activeId
        )

      if (!movingTask)
        return prevCategories

      return prevCategories.map(
        (category) => {
          if (
            category.id === activeCategory.id
          ) {
            return {
              ...category,
              tasks: category.tasks.filter(
                (task) =>
                  task.id !== activeId
              ),
            }
          }

          if (
            category.id === overCategory.id
          ) {
            const overTaskIndex =
              category.tasks.findIndex(
                (task) => task.id === overId
              )

            const nextTasks = [
              ...category.tasks,
            ]

            if (overTaskIndex >= 0) {
              nextTasks.splice(
                overTaskIndex,
                0,
                movingTask
              )
            } else {
              nextTasks.push(movingTask)
            }

            return {
              ...category,
              tasks: nextTasks,
            }
          }

          return category
        }
      )
    })
  }

  const handleDragEnd = (
    event: DragEndEvent
  ) => {
    const { active, over } = event

    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeCategory =
      findCategoryByTaskId(activeId)

    const overCategory =
      findCategoryByTaskId(overId)

    if (!activeCategory || !overCategory)
      return

    if (activeCategory.id !== overCategory.id)
      return

    setCategories((prevCategories) =>
      prevCategories.map((category) => {
        if (
          category.id !== activeCategory.id
        )
          return category

        const oldIndex =
          category.tasks.findIndex(
            (task) => task.id === activeId
          )

        const newIndex =
          category.tasks.findIndex(
            (task) => task.id === overId
          )

        return {
          ...category,
          tasks: arrayMove(
            category.tasks,
            oldIndex,
            newIndex
          ),
        }
      })
    )
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <LayoutGrid className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                ✽ {team} {manager}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setModalOpen(true)
              }
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-4" />
            </button>
              
            <span className="text-xs text-muted-foreground">
              {categories.length} CATEGORIES
            </span>

            <button
              type="button"
              onClick={() =>
                setExpanded((prev) => !prev)
              }
              className="rounded-lg p-1 hover:bg-muted"
            >
              <ChevronUp
                className={cn(
                  "size-5 text-muted-foreground transition-transform",
                  !expanded &&
                    "rotate-180"
                )}
              />
            </button>
          </div>
        </div>

        {expanded && (
          <DndContext
            sensors={sensors}
            collisionDetection={
              closestCorners
            }
            onDragStart={
              handleDragStart
            }
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4">
                {categories.map(
                  (category) => {
                    const columnType =
                      getColumnType(category)

                    return (
                      <KanbanColumn
                        key={category.id}
                        id={category.id}
                        title={category.title}
                        count={
                          category.tasks.length
                        }
                        tasks={category.tasks}
                        color={category.color}
                        columnType={
                          columnType
                        }
                      />
                    )
                  }
                )}
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/3 rounded-full bg-muted-foreground/30" />
              </div>
            </div>

            <DragOverlay>
              {activeTask && (
                <TaskCard
                  task={activeTask}
                  isDragging
                  columnType={
                    activeColumnType
                  }
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </section>

      <ProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={(data) => {
          console.log(
            "프로젝트 수정:",
            data
          )
        }}
      />
    </>
  )
}