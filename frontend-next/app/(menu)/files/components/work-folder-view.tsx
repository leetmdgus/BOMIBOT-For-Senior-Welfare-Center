"use client"

import { CornerLeftUp, Folder } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import type { WorkFolder } from "@/lib/files/work-folders"

interface WorkFolderCardProps {
  folder: WorkFolder
  onOpen: (folder: WorkFolder) => void
}

/** 루트(업무 폴더 목록) 그리드 카드 — 드래그 불가, 클릭 시 진입 */
export function WorkFolderCard({ folder, onOpen }: WorkFolderCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(folder)}
      className="group relative flex flex-col rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md"
    >
      <div className="mb-3 flex h-20 items-center justify-center rounded-lg bg-muted/50">
        <Folder className="size-10 text-amber-500" />
      </div>
      <p className="truncate text-sm font-medium">{folder.name}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {folder.fileCount}개 파일
        </span>
        {folder.year && (
          <Badge variant="outline" className="text-[10px]">
            {folder.year}
          </Badge>
        )}
      </div>
    </button>
  )
}

/** 루트(업무 폴더 목록) 리스트 테이블 */
export function WorkFolderList({
  folders,
  onOpen,
}: {
  folders: WorkFolder[]
  onOpen: (folder: WorkFolder) => void
}) {
  return (
    <div className="rounded-lg border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="p-4">업무</th>
            <th className="p-4">연도</th>
            <th className="p-4">파일 수</th>
            <th className="p-4">최근 수정일</th>
          </tr>
        </thead>
        <tbody>
          {folders.map((folder) => (
            <tr
              key={folder.id}
              className="cursor-pointer border-b hover:bg-muted/50"
              onClick={() => onOpen(folder)}
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <Folder className="size-5 text-amber-500" />
                  <span className="font-medium">{folder.name}</span>
                </div>
              </td>
              <td className="p-4 text-sm text-muted-foreground">
                {folder.year ?? "-"}
              </td>
              <td className="p-4 text-sm text-muted-foreground">
                {folder.fileCount}개
              </td>
              <td className="p-4 text-sm text-muted-foreground">
                {folder.latestModifiedAt.slice(0, 10)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 업무 폴더 안에서 맨 앞에 두는 "상위로(..)" 그리드 카드 */
export function ParentUpCard({ onUp }: { onUp: () => void }) {
  return (
    <button
      type="button"
      onClick={onUp}
      className={cn(
        "group relative flex flex-col rounded-xl border border-dashed bg-card/60 p-4 text-left transition-all hover:bg-muted/50 hover:shadow-md",
      )}
      title="뒤로가기"
    >
      <div className="mb-3 flex h-20 items-center justify-center rounded-lg bg-muted/40">
        <CornerLeftUp className="size-10 text-muted-foreground" />
      </div>
      <p className="truncate text-sm font-medium text-muted-foreground">..</p>
      <span className="mt-1 text-xs text-muted-foreground">뒤로가기</span>
    </button>
  )
}

/** 업무 폴더 안 리스트 맨 앞 "상위로(..)" 행 — FileList의 parentRow로 전달 */
export function ParentUpRow({ onUp }: { onUp: () => void }) {
  return (
    <tr className="cursor-pointer border-b hover:bg-muted/50" onClick={onUp}>
      <td className="w-10 p-4" />
      <td className="w-9 p-2" />
      <td className="p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <CornerLeftUp className="size-5" />
          <span className="font-medium">..</span>
        </div>
      </td>
      <td className="p-4 text-sm text-muted-foreground">뒤로가기</td>
      <td className="p-4" />
      <td className="p-4" />
      <td className="p-4" />
    </tr>
  )
}
