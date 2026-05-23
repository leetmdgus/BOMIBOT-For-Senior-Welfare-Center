"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FORMAL_DOCUMENT_TEMPLATES } from "@/lib/formal-document-html"
import { cn } from "@/lib/utils"

type FormalDocumentToolbarProps = {
  onInsertHtml: (html: string) => void
  onApplyBodyStyle?: () => void
  disabled?: boolean
  className?: string
}

/** 한글 사업계획서형 빠른 서식 */
export function FormalDocumentToolbar({
  onInsertHtml,
  onApplyBodyStyle,
  disabled,
  className,
}: FormalDocumentToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 border-t border-gray-200/80 bg-[#fafafa] px-1.5 py-1",
        className,
      )}
    >
      <span className="mr-1 shrink-0 text-[10px] font-medium text-neutral-600">
        한글형:
      </span>
      <ToolbarChip
        label="Ⅲ. 대목차"
        disabled={disabled}
        onClick={() =>
          onInsertHtml(
            FORMAL_DOCUMENT_TEMPLATES.find((t) => t.id === "chapter-3")!.html,
          )
        }
      />
      <ToolbarChip
        label="4. 소제목"
        disabled={disabled}
        onClick={() =>
          onInsertHtml(
            FORMAL_DOCUMENT_TEMPLATES.find((t) => t.id === "section-plain")!
              .html,
          )
        }
      />
      <ToolbarChip
        label="실인원 표"
        disabled={disabled}
        onClick={() =>
          onInsertHtml(
            FORMAL_DOCUMENT_TEMPLATES.find((t) => t.id === "staff-table")!.html,
          )
        }
      />
      <ToolbarChip
        label="1. 소제목"
        disabled={disabled}
        onClick={() =>
          onInsertHtml(
            FORMAL_DOCUMENT_TEMPLATES.find((t) => t.id === "section")!.html,
          )
        }
      />
      <ToolbarChip
        label="● 항목"
        disabled={disabled}
        onClick={() =>
          onInsertHtml(
            FORMAL_DOCUMENT_TEMPLATES.find((t) => t.id === "bullet")!.html,
          )
        }
      />
      <ToolbarChip
        label="본문"
        disabled={disabled}
        onClick={() =>
          onInsertHtml(
            FORMAL_DOCUMENT_TEMPLATES.find((t) => t.id === "body")!.html,
          )
        }
      />
      {onApplyBodyStyle ? (
        <ToolbarChip
          label="양쪽정렬"
          disabled={disabled}
          onClick={onApplyBodyStyle}
        />
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-6 px-2 text-[10px]"
          >
            문서 양식 ▾
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-xs">사업계획서 양식</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {FORMAL_DOCUMENT_TEMPLATES.map((tpl) => (
            <DropdownMenuItem
              key={tpl.id}
              className="flex flex-col items-start gap-0.5 text-xs"
              onClick={() => onInsertHtml(tpl.html)}
            >
              <span className="font-medium">{tpl.label}</span>
              {tpl.description ? (
                <span className="text-[10px] text-muted-foreground">
                  {tpl.description}
                </span>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function ToolbarChip({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className="h-6 border-gray-300 bg-white px-2 text-[10px] font-normal"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
