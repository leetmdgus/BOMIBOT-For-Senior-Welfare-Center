"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Search, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  projectImageOptions,
  projectsMock,
  staffMock,
} from "@/lib/mocks/kanban.board.mock"
import { KanbanProject, ProjectImageOption, Staff, Task } from "@/services/kanban.board.types"

interface ProjectOption {
  id: string
  name: string
  categoryId: string
}

interface TaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "create" | "edit"
  formType?: "newProject" | "task"
  columnType?: "실적관리" | "사업계획" | "만족도조사" | "사업평가"
  task?: Task

  projects?: KanbanProject[]
  staffList?: Staff[]
  projectImages?: ProjectImageOption[]

  defaultProjectId?: string
  defaultCategoryId?: string
  lockProjectSelect?: boolean
  onSubmit?: (task: TaskFormData) => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

export interface TaskFormData {
  projectId?: string
  categoryId?: string
  projectName: string
  projectImage: string
  title: string
  description: string
  assignees: Staff[]
}

const initialFormData: TaskFormData = {
  projectId: "",
  categoryId: "",
  projectName: "",
  projectImage: "",
  title: "",
  description: "",
  assignees: [],
}

export function TaskModal({
  open,
  onOpenChange,
  mode = "create",
  formType = "task",
  columnType,
  task,
  defaultProjectId,
  defaultCategoryId,
  lockProjectSelect = false,
  onSubmit,
  onDelete,
}: TaskModalProps) {
  const [formData, setFormData] = useState<TaskFormData>(initialFormData)
  const [showAssigneeList, setShowAssigneeList] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isNewProjectForm = formType === "newProject"

  const staffList = staffMock
  const projectImages = projectImageOptions

  const existingProjects = useMemo<ProjectOption[]>(
    () =>
      projectsMock.map((project) => ({
        id: project.id,
        name: project.title,
        categoryId: project.categories[0]?.id ?? "실적관리",
      })),
    [open]
  )

  useEffect(() => {
    if (!open) return

    const selectedProject = existingProjects.find(
      (project) => project.id === defaultProjectId
    )

    if (task && mode === "edit") {
      setFormData({
        projectId: selectedProject?.id ?? "",
        categoryId: defaultCategoryId ?? selectedProject?.categoryId ?? "",
        projectName: selectedProject?.name ?? "",
        projectImage: "",
        title: task.title,
        description: task.description,
        assignees: [],
      })
      return
    }

    setFormData({
      ...initialFormData,
      projectId: selectedProject?.id ?? "",
      categoryId: defaultCategoryId ?? selectedProject?.categoryId ?? "",
      projectName: selectedProject?.name ?? "",
    })
  }, [
    open,
    task,
    mode,
    defaultProjectId,
    defaultCategoryId,
    existingProjects,
  ])

  const filteredStaff = staffList.filter((staff) => {
    const keyword = searchQuery.trim()

    if (!keyword) return true

    return (
      staff.name.includes(keyword) ||
      staff.team.includes(keyword) ||
      staff.position.includes(keyword)
    )
  })

  const resetForm = () => {
    setFormData(initialFormData)
    setSearchQuery("")
    setShowAssigneeList(true)
    setIsSubmitting(false)
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (isNewProjectForm && !formData.projectName.trim()) return
    if (isNewProjectForm && !formData.projectImage.trim()) return
    if (!isNewProjectForm && !formData.projectId) return
    if (!isNewProjectForm && !formData.categoryId) return
    if (!formData.title.trim()) return

    try {
      setIsSubmitting(true)
      await onSubmit?.(formData)
      handleClose()
    } catch (error) {
      console.error("저장 실패:", error)
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsSubmitting(true)
      await onDelete?.()
      handleClose()
    } catch (error) {
      console.error("삭제 실패:", error)
      setIsSubmitting(false)
    }
  }

  const toggleAssignee = (staff: Staff) => {
    setFormData((prev) => {
      const isSelected = prev.assignees.some(
        (assignee) => assignee.id === staff.id
      )

      return {
        ...prev,
        assignees: isSelected
          ? prev.assignees.filter((assignee) => assignee.id !== staff.id)
          : [...prev.assignees, staff],
      }
    })
  }

  const removeAssignee = (staffId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignees: prev.assignees.filter((assignee) => assignee.id !== staffId),
    }))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose()
          return
        }

        onOpenChange(true)
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-0 bg-background p-0 shadow-2xl [&>button]:hidden">
        <DialogHeader className="border-b border-border px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "edit"
                  ? "업무 수정"
                  : isNewProjectForm
                    ? "신규 사업 등록"
                    : "업무 추가"}
              </DialogTitle>

              {columnType && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {columnType}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-6 py-2">
          <div className="space-y-2">
            <label className="text-lg font-semibold text-foreground">
              사업명
            </label>

            {isNewProjectForm ? (
              <Input
                placeholder="신규 사업명을 입력하세요"
                value={formData.projectName}
                disabled={isSubmitting}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    projectName: event.target.value,
                  })
                }
                className="h-12 border-0 bg-muted text-base"
              />
            ) : mode === "edit" || lockProjectSelect ? (
              <div className="flex h-12 items-center rounded-md bg-muted px-3 text-base">
                {formData.projectName}
              </div>
            ) : (
              <Select
                value={formData.projectId}
                onValueChange={(value) => {
                  const selectedProject = existingProjects.find(
                    (project) => project.id === value
                  )

                  if (!selectedProject) return

                  setFormData({
                    ...formData,
                    projectId: selectedProject.id,
                    projectName: selectedProject.name,
                    categoryId: selectedProject.categoryId,
                  })
                }}
              >
                <SelectTrigger className="h-12 border-0 bg-muted text-base">
                  <SelectValue placeholder="사업을 선택하세요" />
                </SelectTrigger>

                <SelectContent>
                  {existingProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {isNewProjectForm && (
            <div className="space-y-3">
              <label className="text-lg font-semibold text-foreground">
                사업 이미지
              </label>

              <div className="grid grid-cols-3 gap-3">
                {projectImages.map((image: ProjectImageOption) => {
                  const active = formData.projectImage === image.value

                  return (
                    <button
                      key={image.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          projectImage: image.value,
                        })
                      }
                      className={cn(
                        "overflow-hidden rounded-xl border-2 bg-card p-3 transition-all disabled:cursor-not-allowed disabled:opacity-50",
                        active
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="relative mx-auto h-20 w-20">
                        <Image
                          src={image.value}
                          alt={image.label}
                          fill
                          className="object-contain"
                        />
                      </div>

                      <p className="mt-2 text-sm font-medium">
                        {image.label}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <label className="text-lg font-semibold text-foreground">
              세부사업명
            </label>

            <Input
              placeholder="세부사업명을 입력하세요"
              value={formData.title}
              disabled={isSubmitting}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  title: event.target.value,
                })
              }
              className="h-12 border-0 bg-muted text-base"
            />
          </div>

          <div className="space-y-2">
            <label className="text-lg font-semibold text-foreground">
              업무 설명
            </label>

            <Textarea
              placeholder="업무 설명을 입력하세요"
              value={formData.description}
              disabled={isSubmitting}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  description: event.target.value,
                })
              }
              className="min-h-[80px] border-0 bg-muted text-base"
            />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowAssigneeList((prev) => !prev)}
              className="flex w-full items-center justify-between border-b border-border pb-2 text-lg font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>담당자</span>
              {showAssigneeList ? (
                <ChevronUp className="size-5" />
              ) : (
                <ChevronDown className="size-5" />
              )}
            </button>

            {showAssigneeList && (
              <div className="grid grid-cols-[1fr_240px] gap-4">
                <div className="min-h-[120px] rounded-lg border border-border bg-card p-3">
                  <div className="flex flex-wrap gap-2">
                    {formData.assignees.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        담당자를 선택하세요
                      </span>
                    ) : (
                      formData.assignees.map((assignee) => (
                        <div
                          key={assignee.id}
                          className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm"
                        >
                          <span className="size-2 rounded-full bg-primary" />

                          <span>
                            {assignee.team} {assignee.name}{" "}
                            {assignee.position}
                          </span>

                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => removeAssignee(assignee.id)}
                            className="ml-1 rounded-full text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="담당자 삭제"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card">
                  <div className="border-b border-border bg-muted px-3 py-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                      <Input
                        placeholder="검색"
                        value={searchQuery}
                        disabled={isSubmitting}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-8 border-0 bg-transparent pl-8 text-sm shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <div className="max-h-[150px] overflow-y-auto p-2">
                    {filteredStaff.length > 0 ? (
                      filteredStaff.map((staff) => {
                        const isSelected = formData.assignees.some(
                          (assignee) => assignee.id === staff.id
                        )

                        return (
                          <button
                            key={staff.id}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => toggleAssignee(staff)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
                              isSelected && "bg-muted font-medium"
                            )}
                          >
                            <span
                              className={cn(
                                "size-3 rounded-full border-2",
                                isSelected
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/30"
                              )}
                            />

                            <span>
                              {staff.team} {staff.name} {staff.position}
                            </span>
                          </button>
                        )
                      })
                    ) : (
                      <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                        검색 결과가 없습니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3 border-t border-border pt-6">
            {mode === "edit" && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="h-12 w-32 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="mr-2 size-4" />
                삭제
              </Button>
            )}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-12 w-48"
            >
              {isSubmitting
                ? "저장 중"
                : mode === "edit"
                  ? "수정 완료"
                  : isNewProjectForm
                    ? "사업 등록"
                    : "업무 추가"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}