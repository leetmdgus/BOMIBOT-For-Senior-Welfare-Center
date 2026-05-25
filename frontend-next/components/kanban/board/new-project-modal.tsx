"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ProjectImagePicker } from "./project-image-picker"
import {
  getProjectImageOptions,
  getStaffList,
} from "@/services/kanban.board.service"
import type { ProjectImageOption, Staff } from "@/services/kanban.board.types"
import type { TaskFormData } from "./task-modal"

interface NewProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  year: string
  staffList?: Staff[]
  projectImages?: ProjectImageOption[]
  onSubmit: (data: TaskFormData) => Promise<void>
}

type FormErrors = {
  projectName?: string
  projectImage?: string
}

export function NewProjectModal({
  open,
  onOpenChange,
  year,
  staffList: staffListProp,
  projectImages: projectImagesProp,
  onSubmit,
}: NewProjectModalProps) {
  const [projectName, setProjectName] = useState("")
  const [projectImage, setProjectImage] = useState("")
  const [firstTaskTitle, setFirstTaskTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [staffList, setStaffList] = useState<Staff[]>(staffListProp ?? [])
  const [projectImages, setProjectImages] = useState<ProjectImageOption[]>(
    projectImagesProp ?? []
  )
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [optionsLoadError, setOptionsLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setProjectName("")
    setProjectImage("")
    setFirstTaskTitle("")
    setDescription("")
    setSelectedStaffId("")
    setErrors({})

    let cancelled = false
    setIsLoadingOptions(true)
    setOptionsLoadError(null)

    Promise.all([
      staffListProp?.length ? Promise.resolve(staffListProp) : getStaffList(),
      projectImagesProp?.length
        ? Promise.resolve(projectImagesProp)
        : getProjectImageOptions(),
    ])
      .then(([staff, images]) => {
        if (cancelled) return
        setStaffList(staff)
        setProjectImages(images)
        if (images.length === 1) setProjectImage(images[0].value)
        if (images.length === 0) {
          setOptionsLoadError(
            "사업 이미지 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.",
          )
        }
      })
      .catch((error) => {
        console.error("신규 사업 모달 데이터 로드 실패:", error)
        if (!cancelled) {
          setOptionsLoadError(
            "모달 데이터를 불러오지 못했습니다. API(8020) 실행 여부를 확인해 주세요.",
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOptions(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, staffListProp, projectImagesProp])

  const validate = (): boolean => {
    const nextErrors: FormErrors = {}

    if (!projectName.trim()) {
      nextErrors.projectName = "사업명을 입력해 주세요."
    }

    if (!projectImage.trim()) {
      nextErrors.projectImage = "사업 이미지를 선택해 주세요."
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    const assignee = staffList.find((staff) => staff.id === selectedStaffId)

    try {
      setIsSubmitting(true)
      await onSubmit({
        projectName: projectName.trim(),
        projectImage,
        title: firstTaskTitle.trim() || projectName.trim(),
        description: description.trim(),
        assignees: assignee ? [assignee] : [],
      })
      onOpenChange(false)
    } catch (error) {
      console.error("신규 사업 등록 실패:", error)
      setErrors({
        projectName: "등록에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border border-border bg-background p-0 sm:max-w-[520px]">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <DialogTitle className="text-lg font-semibold">신규 사업 등록</DialogTitle>
          <DialogDescription>
            {year}년 칸반 보드에 추가할 사업 정보를 입력합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(70vh,560px)] space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="project-name">
              사업명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="예: 건강증진 프로그램"
              value={projectName}
              disabled={isSubmitting}
              onChange={(event) => {
                setProjectName(event.target.value)
                if (errors.projectName) {
                  setErrors((prev) => ({ ...prev, projectName: undefined }))
                }
              }}
              className={errors.projectName ? "border-destructive" : undefined}
            />
            {errors.projectName ? (
              <p className="text-sm text-destructive">{errors.projectName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>
              사업 이미지 <span className="text-destructive">*</span>
            </Label>
            <ProjectImagePicker
              images={projectImages}
              value={projectImage}
              onChange={(value) => {
                setProjectImage(value)
                if (errors.projectImage) {
                  setErrors((prev) => ({ ...prev, projectImage: undefined }))
                }
              }}
              disabled={isSubmitting}
              isLoading={isLoadingOptions}
              error={errors.projectImage ?? optionsLoadError ?? undefined}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            <p className="text-sm font-medium text-foreground">
              첫 업무 (선택)
            </p>
            <p className="text-xs text-muted-foreground -mt-2">
              비워 두면 사업명으로 실적관리 칸에 카드가 하나 생성됩니다.
            </p>

            <div className="space-y-2">
              <Label htmlFor="first-task">세부사업명</Label>
              <Input
                id="first-task"
                placeholder="예: 3월 프로그램 운영"
                value={firstTaskTitle}
                disabled={isSubmitting}
                onChange={(event) => setFirstTaskTitle(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-desc">업무 설명</Label>
              <Textarea
                id="task-desc"
                placeholder="업무 설명 (선택)"
                value={description}
                disabled={isSubmitting}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-[72px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">담당자</Label>
              <select
                id="assignee"
                value={selectedStaffId}
                disabled={isSubmitting || staffList.length === 0}
                onChange={(event) => setSelectedStaffId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">담당자 선택 (선택)</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.team} {staff.name} {staff.position}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || isLoadingOptions}
            onClick={handleSubmit}
          >
            {isSubmitting ? "등록 중..." : "사업 등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
