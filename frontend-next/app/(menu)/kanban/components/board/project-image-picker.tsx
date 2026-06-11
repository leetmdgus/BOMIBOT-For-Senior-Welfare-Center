"use client"

import Image from "next/image"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ProjectImageOption } from "@/services/kanban.board.types"

interface ProjectImagePickerProps {
  images: ProjectImageOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  isLoading?: boolean
  error?: string
}

export function ProjectImagePicker({
  images,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  error,
}: ProjectImagePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        보드에 표시할 아이콘을 선택하세요.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          이미지 목록을 불러오는 중입니다.
        </div>
      ) : images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          선택 가능한 이미지가 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => {
            const active = value === image.value

            return (
              <button
                key={image.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(image.value)}
                className={cn(
                  "flex flex-col items-center rounded-xl border-2 bg-card p-4 transition-all",
                  "hover:border-primary/50 hover:shadow-sm",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/25"
                    : "border-border"
                )}
              >
                <div className="relative mb-2 h-16 w-16">
                  <Image
                    src={image.value}
                    alt={image.label}
                    fill
                    className="object-contain"
                  />
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    active ? "text-primary" : "text-foreground"
                  )}
                >
                  {image.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
