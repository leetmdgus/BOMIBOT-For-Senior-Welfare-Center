"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Search, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import type { Task } from "./task-card"

interface Staff {
  id: string
  name: string
  team: string
  position: string
}

interface TaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "create" | "edit"
  columnType?: "실적관리" | "사업계획" | "만족도조사" | "사업평가"
  task?: Task
  onSubmit?: (task: TaskFormData) => void
  onDelete?: () => void
}

interface TaskFormData {
  projectName: string
  title: string
  description: string
  priority: "HIGH" | "MEDIUM" | "LOW"
  assignees: Staff[]
  progressCount: string
  completedCount: number
  totalCount: number
}

const staffList: Staff[] = [
  { id: "1", name: "김태민", team: "복지 1팀", position: "사회복지사" },
  { id: "2", name: "이창환", team: "복지 1팀", position: "사회복지사" },
  { id: "3", name: "이승현", team: "복지 1팀", position: "사회복지사" },
  { id: "4", name: "김영수", team: "복지 2팀", position: "사회복지사" },
  { id: "5", name: "박지연", team: "복지 2팀", position: "사회복지사" },
  { id: "6", name: "최민수", team: "운영지원팀", position: "사회복지사" },
]

const existingProjects = [
  { id: "p1", name: "일반상담 및 정보제공사업" },
  { id: "p2", name: "전문상담사업" },
  { id: "p3", name: "노인교육사업" },
  { id: "p4", name: "여가문화사업" },
]

const priorityOptions = [
  {
    value: "HIGH",
    label: "높음",
    badge: "HIGH",
    dotClassName: "bg-red-500",
  },
  {
    value: "MEDIUM",
    label: "보통",
    badge: "MEDIUM",
    dotClassName: "bg-yellow-500",
  },
  {
    value: "LOW",
    label: "낮음",
    badge: "LOW",
    dotClassName: "bg-gray-400",
  },
] as const

const initialFormData: TaskFormData = {
  projectName: "",
  title: "",
  description: "",
  priority: "MEDIUM",
  assignees: [],
  progressCount: "",
  completedCount: 0,
  totalCount: 10,
}

export function TaskModal({
  open,
  onOpenChange,
  mode = "create",
  columnType,
  task,
  onSubmit,
  onDelete,
}: TaskModalProps) {
  const [formData, setFormData] = useState<TaskFormData>(initialFormData)
  const [showAssigneeList, setShowAssigneeList] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!open) return

    if (task && mode === "edit") {
      setFormData({
        projectName: "",
        title: task.title,
        description: task.description,
        priority: task.priority,
        assignees: [],
        progressCount: task.progressCount,
        completedCount: task.completedCount ?? 0,
        totalCount: task.totalCount ?? 10,
      })
      return
    }

    setFormData(initialFormData)
  }, [open, task, mode])

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
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = () => {
    if (!formData.title.trim()) return

    onSubmit?.(formData)
    handleClose()
  }

  const handleDelete = () => {
    onDelete?.()
    handleClose()
  }

  const toggleAssignee = (staff: Staff) => {
    setFormData((prev) => {
      const isSelected = prev.assignees.some((assignee) => assignee.id === staff.id)

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
                {mode === "create" ? "업무 등록" : "업무 수정"}
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
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6">
          <div className="space-y-2">
            <label className="text-lg font-semibold text-foreground">
              사업명
            </label>

            <Select
              value={formData.projectName}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  projectName: value,
                })
              }
            >
              <SelectTrigger className="h-12 border-0 bg-muted text-base">
                <SelectValue placeholder="사업 선택" />
              </SelectTrigger>

              <SelectContent>
                {existingProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <label className="text-lg font-semibold text-foreground">
              세부사업명
            </label>

            <Input
              placeholder="세부사업명을 입력하세요"
              value={formData.title}
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
            <label className="text-lg font-semibold text-foreground">
              우선순위
            </label>

            <div className="grid grid-cols-3 gap-2">
              {priorityOptions.map((option) => {
                const active = formData.priority === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        priority: option.value,
                      })
                    }
                    className={cn(
                      "flex h-11 items-center justify-between rounded-lg border px-3 text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2.5 rounded-full", option.dotClassName)} />
                      {option.label}
                    </span>

                    {active && (
                      <Badge variant="secondary" className="text-[10px]">
                        {option.badge}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAssigneeList((prev) => !prev)}
              className="flex w-full items-center justify-between border-b border-border pb-2 text-lg font-semibold text-foreground"
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
                            {assignee.team} {assignee.name} {assignee.position}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeAssignee(assignee.id)}
                            className="ml-1 rounded-full text-muted-foreground hover:text-foreground"
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
                            onClick={() => toggleAssignee(staff)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
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

          <div className="space-y-2">
            <label className="text-lg font-semibold text-foreground">
              마감일
            </label>

            <Input
              type="date"
              value={formData.progressCount}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  progressCount: event.target.value,
                })
              }
              className="h-12 border-0 bg-muted text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-lg font-semibold text-foreground">
                완료 수
              </label>

              <Input
                type="number"
                min="0"
                value={formData.completedCount}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    completedCount: Number(event.target.value) || 0,
                  })
                }
                className="h-12 border-0 bg-muted text-base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-lg font-semibold text-foreground">
                목표 수
              </label>

              <Input
                type="number"
                min="1"
                value={formData.totalCount}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    totalCount: Number(event.target.value) || 1,
                  })
                }
                className="h-12 border-0 bg-muted text-base"
              />
            </div>
          </div>

          <div className="flex justify-center gap-3 border-t border-border pt-6">
            {mode === "edit" && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                className="h-12 w-32 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="mr-2 size-4" />
                삭제
              </Button>
            )}

            <Button
              type="button"
              onClick={handleSubmit}
              className="h-12 w-48"
            >
              {mode === "create" ? "등록" : "수정 완료"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}