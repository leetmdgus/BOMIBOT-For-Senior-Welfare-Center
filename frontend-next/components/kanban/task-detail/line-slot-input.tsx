"use client"

import { Textarea } from "@/components/ui/textarea"
import {
  LINE_SLOT_PLACEHOLDER,
  joinLineSlots,
  parseLineSlots,
} from "@/lib/line-slot-utils"
import { cn } from "@/lib/utils"

type LineSlotInputProps = {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  className?: string
  minRows?: number
  onFocus?: () => void
}

/** 한 줄씩 입력 → 목록(ul)으로 표시되는 슬롯 필드 */
export function LineSlotInput({
  value,
  onChange,
  readOnly = false,
  className,
  minRows = 3,
  onFocus,
}: LineSlotInputProps) {
  const lines = parseLineSlots(value)
  const editValue =
    lines.length > 0 ? joinLineSlots(lines) : value === LINE_SLOT_PLACEHOLDER ? "" : value

  if (readOnly) {
    if (lines.length === 0) {
      return <span className="text-sm text-muted-foreground">-</span>
    }
    return (
      <ul className={cn("list-disc space-y-1 pl-5 text-sm text-[#111]", className)}>
        {lines.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Textarea
        value={editValue}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={LINE_SLOT_PLACEHOLDER}
        rows={minRows}
        className="hwpx-field-textarea line-slot-textarea min-h-0 resize-y text-sm print:border-0 print:bg-transparent print:shadow-none"
      />
      <ul
        className={cn(
          "hidden list-disc space-y-0.5 pl-5 text-sm text-[#111] print:block",
          lines.length === 0 && "italic text-muted-foreground",
        )}
      >
        {lines.length > 0 ? (
          lines.map((line, index) => <li key={`print-${index}`}>{line}</li>)
        ) : (
          <li>-</li>
        )}
      </ul>
    </div>
  )
}

type LineSlotGoalsInputProps = {
  goals: string[]
  onChange: (goals: string[]) => void
  readOnly?: boolean
  className?: string
  onFocus?: () => void
}

export function LineSlotGoalsInput({
  goals,
  onChange,
  readOnly = false,
  className,
  onFocus,
}: LineSlotGoalsInputProps) {
  const text = joinLineSlots(goals)

  if (readOnly) {
    return (
      <ul className={cn("list-disc space-y-1 pl-5 text-sm text-[#111]", className)}>
        {goals.map((goal, index) => (
          <li key={`${goal}-${index}`}>{goal}</li>
        ))}
      </ul>
    )
  }

  return (
    <LineSlotInput
      value={text}
      onChange={(next) => {
        const parsed = parseLineSlots(next)
        onChange(parsed.length > 0 ? parsed : [""])
      }}
      className={className}
      minRows={2}
      onFocus={onFocus}
    />
  )
}
