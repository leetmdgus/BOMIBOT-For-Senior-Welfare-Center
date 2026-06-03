"use client"

import { Fragment, type ReactNode } from "react"
import { ChevronRight, HardDrive } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"

import { cn } from "@/lib/utils"

import type { FileItem } from "./file-types"

interface FilesBreadcrumbProps {
  /** 루트 → 현재 폴더까지의 조상 폴더 목록 (현재 폴더가 마지막 요소) */
  trail: FileItem[]
  onNavigate: (folderId: string | null) => void
}

function Crumb({
  dropId,
  label,
  icon,
  isCurrent,
  onClick,
}: {
  dropId: string
  label: string
  icon?: ReactNode
  isCurrent: boolean
  onClick: () => void
}) {
  // 경로 위에 드래그하면 해당 폴더로 이동 (구글 드라이브와 동일)
  const droppable = useDroppable({ id: dropId })

  return (
    <button
      ref={droppable.setNodeRef}
      type="button"
      onClick={onClick}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "flex max-w-[12rem] shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors",
        isCurrent
          ? "font-semibold text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        droppable.isOver && "bg-primary/10 ring-1 ring-primary/40",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}

export function FilesBreadcrumb({ trail, onNavigate }: FilesBreadcrumbProps) {
  return (
    <nav
      aria-label="파일 경로"
      className="flex min-w-0 items-center gap-0.5 overflow-x-auto"
    >
      <Crumb
        dropId="folder:root"
        label="내 파일"
        icon={<HardDrive className="size-4 shrink-0" />}
        isCurrent={trail.length === 0}
        onClick={() => onNavigate(null)}
      />
      {trail.map((folder, index) => (
        <Fragment key={folder.id}>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
          <Crumb
            dropId={`folder:${folder.id}`}
            label={folder.name}
            isCurrent={index === trail.length - 1}
            onClick={() => onNavigate(folder.id)}
          />
        </Fragment>
      ))}
    </nav>
  )
}
