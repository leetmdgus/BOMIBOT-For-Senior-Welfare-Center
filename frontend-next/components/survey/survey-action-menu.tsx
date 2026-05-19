"use client"

import {
  Copy,
  Eye,
  MoreVertical,
  Printer,
  QrCode,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ViewMode } from "./survey-detail-page"

interface SurveyActionMenuProps {
  viewMode: ViewMode
  onViewChange: (mode: ViewMode) => void
  onCopyResults?: () => void
  onCopyRespondLink?: () => void
  onPrint?: () => void
  onQr?: () => void
  onDelete?: () => void
}

export function SurveyActionMenu({
  viewMode,
  onViewChange,
  onCopyResults,
  onCopyRespondLink,
  onPrint,
  onQr,
  onDelete,
}: SurveyActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="설문 메뉴">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        {viewMode === "edit" && (
          <>
            <DropdownMenuItem onClick={() => onViewChange("results")}>
              <Eye className="mr-2 size-4" />
              결과보기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyRespondLink}>
              <Copy className="mr-2 size-4" />
              응답 링크 복사
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onQr}>
              <QrCode className="mr-2 size-4" />
              응답 화면 열기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPrint}>
              <Printer className="mr-2 size-4" />
              인쇄
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewChange("preview")}>
              미리보기
            </DropdownMenuItem>
          </>
        )}

        {viewMode === "preview" && (
          <>
            <DropdownMenuItem onClick={() => onViewChange("results")}>
              결과보기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyRespondLink}>
              <Copy className="mr-2 size-4" />
              응답 링크 복사
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onQr}>
              <QrCode className="mr-2 size-4" />
              응답 화면 열기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPrint}>
              <Printer className="mr-2 size-4" />
              인쇄
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewChange("edit")}>
              설문 편집
            </DropdownMenuItem>
          </>
        )}

        {viewMode === "results" && (
          <>
            <DropdownMenuItem onClick={onCopyResults}>
              <Copy className="mr-2 size-4" />
              결과복사
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyRespondLink}>
              <Copy className="mr-2 size-4" />
              응답 링크 복사
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onQr}>
              <QrCode className="mr-2 size-4" />
              응답 화면 열기
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 size-4" />
              삭제
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewChange("preview")}>
              미리보기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewChange("edit")}>
              설문 편집
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
