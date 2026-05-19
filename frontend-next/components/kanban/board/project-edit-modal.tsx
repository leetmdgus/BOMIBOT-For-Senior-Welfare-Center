"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { ImagePlus, LayoutGrid } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProjectEditFormData } from "@/services/kanban.board.types"

interface ProjectEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: {
    id: string
    title?: string
    image?: string
  }
  onSubmit: (data: ProjectEditFormData) => Promise<void>
}

export function ProjectEditModal({
  open,
  onOpenChange,
  project,
  onSubmit,
}: ProjectEditModalProps) {
  const [title, setTitle] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    setTitle(project.title ?? "")
    setImageFile(null)
    setImagePreview(project.image ?? "")
  }, [open, project])

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  const handleImageChange = (file?: File) => {
    if (!file) return

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }

    const previewUrl = URL.createObjectURL(file)

    setImageFile(file)
    setImagePreview(previewUrl)
    setObjectUrl(previewUrl)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return

    try {
      setIsSubmitting(true)

      await onSubmit({
        title,
        imageFile,
        imagePreview,
      })

      onOpenChange(false)
    } catch (error) {
      console.error("프로젝트 수정 실패:", error)
    } finally {
      setIsSubmitting(false)
    }
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
              disabled={isSubmitting}
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
                    alt={title || "프로젝트 이미지"}
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
                  disabled={isSubmitting}
                  onChange={(event) =>
                    handleImageChange(event.target.files?.[0])
                  }
                />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}