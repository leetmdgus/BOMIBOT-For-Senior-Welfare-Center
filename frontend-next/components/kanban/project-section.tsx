"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import {
  ChevronUp,
  ImagePlus,
  LayoutGrid,
  Pencil,
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

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { KanbanColumn } from "./kanban-column"
import { TaskModal } from "./task-modal"
import { TaskCard, type Task } from "./task-card"
import {
  createTask,
  getColumnTypeByCategoryTitle,
  type ColumnType,
} from "@/app/api/projects/kanban/services/projects.service"

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
  image?: string
  categories: Category[]
  onRefresh?: () => Promise<void>
}

interface ProjectEditFormData {
  title: string
  imageFile: File | null
  imagePreview?: string
}

export function ProjectSection({
  id,
  title,
  image,
  categories: initialCategories,
  onRefresh,
}: ProjectSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeColumnType, setActiveColumnType] =
    useState<ColumnType>("실적관리")
  const [columnTypeMap, setColumnTypeMap] = useState<Record<string, ColumnType>>(
    {}
  )

  useEffect(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  useEffect(() => {
    const loadColumnTypes = async () => {
      const entries = await Promise.all(
        initialCategories.map(async (category) => [
          category.id,
          await getColumnTypeByCategoryTitle(category.title),
        ])
      )

      setColumnTypeMap(Object.fromEntries(entries))
    }

    loadColumnTypes()
  }, [initialCategories])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
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

  const handleEditProject = async (data: ProjectEditFormData) => {
    console.log("프로젝트 수정:", {
      id,
      title: data.title,
      imageFile: data.imageFile,
    })

    await onRefresh?.()
    setEditModalOpen(false)
  }

  const handleDeleteProject = () => {
    console.log("프로젝트 삭제:", id)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string
    const category = findCategoryByTaskId(activeId)

    if (!category) return

    const task = category.tasks.find((item) => item.id === activeId)

    if (!task) return

    setActiveTask(task)
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeCategory = findCategoryByTaskId(activeId)
    const overCategory = findCategoryByTaskId(overId)

    if (!activeCategory || !overCategory) return
    if (activeCategory.id !== overCategory.id) return

    setCategories((prevCategories) =>
      prevCategories.map((category) => {
        if (category.id !== activeCategory.id) return category

        const oldIndex = category.tasks.findIndex(
          (task) => task.id === activeId
        )

        const newIndex = category.tasks.findIndex((task) => task.id === overId)

        return {
          ...category,
          tasks: arrayMove(category.tasks, oldIndex, newIndex),
        }
      })
    )
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
              {image ? (
                <Image
                  src={image}
                  alt={title}
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
                {title}
              </h2>

              <div className="rounded-full bg-[#a3a3a3] px-2 py-[2px] text-xs font-medium text-white">
                {totalTaskCount}건
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
                  onClick={() => setEditModalOpen(true)}
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
              className="rounded-lg p-1 hover:bg-muted"
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
          >
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4">
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
                    />
                  )
                })}
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
                  columnType={activeColumnType}
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </section>

      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        formType="task"
        onSubmit={async (data) => {
          if (!defaultCategoryId) return

          try {
            await createTask(id, defaultCategoryId, {
              title: data.title,
              description: data.description ?? "",
              assignee: data.assignees[0]?.name ?? "",
            })

            await onRefresh?.()
            setTaskModalOpen(false)
          } catch (error) {
            console.error("업무 추가 실패:", error)
          }
        }}
      />

      <ProjectEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        project={{
          id,
          title,
          image,
        }}
        onSubmit={handleEditProject}
      />
    </>
  )
}

function ProjectEditModal({
  open,
  onOpenChange,
  project,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: {
    id: string
    title: string
    image?: string
  }
  onSubmit: (data: ProjectEditFormData) => Promise<void>
}) {
  const [title, setTitle] = useState(project.title)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    project.image
  )

  useEffect(() => {
    if (!open) return

    setTitle(project.title)
    setImageFile(null)
    setImagePreview(project.image)
  }, [open, project.title, project.image])

  const handleImageChange = (file?: File) => {
    if (!file) return

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    await onSubmit({
      title,
      imageFile,
      imagePreview,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>프로젝트 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">프로젝트명</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="프로젝트명을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">대표 이미지</label>

            <div className="flex items-center gap-4">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt={title}
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <LayoutGrid className="size-8 text-muted-foreground" />
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted">
                <ImagePlus className="size-4" />
                이미지 변경
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    handleImageChange(event.target.files?.[0])
                  }
                />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}