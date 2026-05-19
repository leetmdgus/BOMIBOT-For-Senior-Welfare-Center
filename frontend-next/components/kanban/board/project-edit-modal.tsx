"use client"

import { useEffect, useState } from "react"

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
import { ProjectImagePicker } from "./project-image-picker"
import { getProjectImageOptions } from "@/services/kanban.board.service"
import type { ProjectEditFormData, ProjectImageOption } from "@/services/kanban.board.types"

interface ProjectEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: {
    id: string
    title?: string
    image?: string
  }
  projectImages?: ProjectImageOption[]
  onSubmit: (data: ProjectEditFormData) => Promise<void>
}

export function ProjectEditModal({
  open,
  onOpenChange,
  project,
  projectImages: projectImagesProp,
  onSubmit,
}: ProjectEditModalProps) {
  const [title, setTitle] = useState("")
  const [selectedImage, setSelectedImage] = useState("")
  const [projectImages, setProjectImages] = useState<ProjectImageOption[]>(
    projectImagesProp ?? []
  )
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [titleError, setTitleError] = useState<string>()
  const [imageError, setImageError] = useState<string>()

  useEffect(() => {
    if (!open) return

    setTitle(project.title ?? "")
    setSelectedImage(project.image ?? "")
    setTitleError(undefined)
    setImageError(undefined)

    if (projectImagesProp?.length) {
      setProjectImages(projectImagesProp)
      return
    }

    let cancelled = false
    setIsLoadingImages(true)

    getProjectImageOptions()
      .then((images) => {
        if (!cancelled) setProjectImages(images)
      })
      .catch((error) => {
        console.error("이미지 목록 로드 실패:", error)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingImages(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, project, projectImagesProp])

  const handleSubmit = async () => {
    let hasError = false

    if (!title.trim()) {
      setTitleError("사업명을 입력해 주세요.")
      hasError = true
    }

    if (!selectedImage.trim()) {
      setImageError("사업 이미지를 선택해 주세요.")
      hasError = true
    }

    if (hasError) return

    try {
      setIsSubmitting(true)

      await onSubmit({
        title: title.trim(),
        imageFile: null,
        imagePreview: selectedImage,
      })

      onOpenChange(false)
    } catch (error) {
      console.error("사업 수정 실패:", error)
      setTitleError("저장에 실패했습니다. 다시 시도해 주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border border-border bg-background p-0 sm:max-w-[520px]">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <DialogTitle className="text-lg font-semibold">사업 수정</DialogTitle>
          <DialogDescription>
            사업명과 보드에 표시할 이미지를 변경할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(70vh,480px)] space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="edit-project-name">
              사업명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-project-name"
              value={title}
              disabled={isSubmitting}
              placeholder="사업명을 입력하세요"
              onChange={(event) => {
                setTitle(event.target.value)
                if (titleError) setTitleError(undefined)
              }}
              className={titleError ? "border-destructive" : undefined}
            />
            {titleError ? (
              <p className="text-sm text-destructive">{titleError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>
              사업 이미지 <span className="text-destructive">*</span>
            </Label>
            <ProjectImagePicker
              images={projectImages}
              value={selectedImage}
              onChange={(value) => {
                setSelectedImage(value)
                if (imageError) setImageError(undefined)
              }}
              disabled={isSubmitting}
              isLoading={isLoadingImages}
              error={imageError}
            />
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
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
