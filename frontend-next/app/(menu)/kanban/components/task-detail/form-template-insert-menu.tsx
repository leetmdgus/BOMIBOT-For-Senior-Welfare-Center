"use client"

import { LayoutTemplate } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RICH_TEXT_FORM_TEMPLATES } from "@/lib/document-form-templates"

type FormTemplateInsertMenuProps = {
  onInsertHtml: (html: string) => void
  disabled?: boolean
  className?: string
}

/** 고급 툴바 — 본문에 HWPX형 양식(표·목록 등) 삽입 */
export function FormTemplateInsertMenu({
  onInsertHtml,
  disabled,
  className,
}: FormTemplateInsertMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={className ?? "h-7 gap-1 border-gray-300 bg-white px-2 text-xs"}
          title="양식 삽입"
        >
          <LayoutTemplate className="size-3.5" />
          양식 삽입
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs">본문 양식</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {RICH_TEXT_FORM_TEMPLATES.map((tpl) => (
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
  )
}
