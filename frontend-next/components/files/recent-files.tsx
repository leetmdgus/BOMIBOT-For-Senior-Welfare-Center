"use client"

import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"

import { fileColors, fileIcons } from "./file-icons"
import type { FileItem } from "./file-types"

interface RecentFilesProps {
  items: FileItem[]
  onOpen: (item: FileItem) => void
}

export function RecentFiles({ items, onOpen }: RecentFilesProps) {
  if (items.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Clock className="size-4" />
        최근 사용
      </h2>

      <div className="flex flex-wrap gap-3">
        {items.map((file) => {
          const Icon = fileIcons[file.type]

          return (
            <button
              key={file.id}
              className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 hover:bg-muted"
              onClick={() => onOpen(file)}
            >
              <Icon className={cn("size-4", fileColors[file.type])} />
              <span className="max-w-48 truncate text-sm">{file.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
