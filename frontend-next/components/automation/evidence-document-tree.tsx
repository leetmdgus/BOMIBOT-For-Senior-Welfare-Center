"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from "lucide-react"

import type { EvidenceTreeNode } from "@/lib/automation/document-tree"
import { cn } from "@/lib/utils"

type EvidenceDocumentTreeProps = {
  root: EvidenceTreeNode | null
  selectedPath: string | null
  onSelect: (node: EvidenceTreeNode) => void
  className?: string
}

function formatSize(bytes?: number): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function TreeNodeRow({
  node,
  depth,
  selectedPath,
  onSelect,
  defaultExpanded,
}: {
  node: EvidenceTreeNode
  depth: number
  selectedPath: string | null
  onSelect: (node: EvidenceTreeNode) => void
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? depth < 2)
  const isFolder = node.type === "folder"
  const isSelected = node.type === "file" && node.path === selectedPath
  const hasChildren = Boolean(node.children?.length)

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setExpanded((value) => !value)}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="size-3.5 shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="size-4 shrink-0 text-amber-600" />
          ) : (
            <Folder className="size-4 shrink-0 text-amber-600" />
          )}
          <span className="truncate font-medium">{node.name}</span>
          {hasChildren ? (
            <span className="ml-auto text-xs text-muted-foreground">
              {node.children!.length}
            </span>
          ) : null}
        </button>
        {expanded && hasChildren
          ? node.children!.map((child) => (
              <TreeNodeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))
          : null}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
        isSelected && "bg-primary/10 text-primary",
      )}
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
      onClick={() => onSelect(node)}
    >
      <FileText className="size-4 shrink-0 text-blue-600" />
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
      <span className="text-xs text-muted-foreground">{formatSize(node.size)}</span>
    </button>
  )
}

export function EvidenceDocumentTree({
  root,
  selectedPath,
  onSelect,
  className,
}: EvidenceDocumentTreeProps) {
  const children = useMemo(() => root?.children ?? [], [root])

  if (!root || children.length === 0) {
    return (
      <p className={cn("px-3 py-8 text-center text-sm text-muted-foreground", className)}>
        폴더를 업로드하면 증빙문서 트리가 표시됩니다.
      </p>
    )
  }

  return (
    <div className={cn("space-y-0.5 p-2", className)}>
      <TreeNodeRow
        node={root}
        depth={0}
        selectedPath={selectedPath}
        onSelect={onSelect}
        defaultExpanded
      />
    </div>
  )
}
