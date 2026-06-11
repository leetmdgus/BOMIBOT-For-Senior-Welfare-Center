"use client"

import type { ReactNode, TableHTMLAttributes } from "react"

import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/** 한글 HWP/HWPX 공문·회의록 스타일 문서 래퍼 */
export function HwpxDocument({
  children,
  className,
  compact,
}: {
  children: ReactNode
  className?: string
  /** 참고 패널 등 좁은 영역 */
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "hwpx-doc overflow-hidden bg-white text-[#111]",
        compact && "hwpx-doc--compact",
        className,
      )}
    >
      {children}
    </div>
  )
}

/** 문서 상단 제목 (자간 넓은 명조체) */
export function HwpxDocumentTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <h2 className={cn("hwpx-doc__title", className)}>{children}</h2>
}

export function HwpxTable({
  children,
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="hwpx-doc__table-wrap overflow-x-auto">
      <table className={cn("hwpx-doc__table", className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function HwpxLabel({
  children,
  rowSpan,
  colSpan,
  className,
  sub,
}: {
  children: ReactNode
  rowSpan?: number
  colSpan?: number
  className?: string
  /** 프로그램 평가 하위 라벨 */
  sub?: boolean
}) {
  return (
    <th
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={cn(
        sub ? "hwpx-doc__sublabel" : "hwpx-doc__label",
        className,
      )}
    >
      {children}
    </th>
  )
}

export function HwpxValue({
  children,
  colSpan,
  rowSpan,
  className,
  align = "left",
}: {
  children: ReactNode
  colSpan?: number
  rowSpan?: number
  className?: string
  align?: "left" | "center" | "right"
}) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        "hwpx-doc__value",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </td>
  )
}

/** 표 중간 구역 제목 행 (예: 슈퍼비전, 세부사업) */
export function HwpxBandRow({
  children,
  colSpan = 4,
}: {
  children: ReactNode
  colSpan?: number
}) {
  return (
    <tr>
      <th colSpan={colSpan} className="hwpx-doc__band">
        {children}
      </th>
    </tr>
  )
}

/** HWPX 문서 안에서 보이는 편집용 textarea (테두리 유지) */
export function HwpxTextarea({
  value,
  onChange,
  readOnly,
  placeholder,
  rows = 2,
  className,
  onFocus,
  sectionId,
  sectionField = "title",
}: {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  rows?: number
  className?: string
  onFocus?: () => void
  sectionId?: string | number
  sectionField?: "title" | "content"
}) {
  if (readOnly) {
    return (
      <p className={cn("whitespace-pre-wrap text-[#111]", className)}>
        {value?.trim() ? value : "-"}
      </p>
    )
  }

  return (
    <Textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={onFocus}
      placeholder={placeholder}
      rows={rows}
      className={cn("hwpx-field-textarea", className)}
      data-bp-section-id={sectionId != null ? String(sectionId) : undefined}
      data-bp-section-field={sectionField}
    />
  )
}

const HWPX_BODY_COLGROUP = (
  <colgroup>
    <col className="w-[6.5rem]" />
    <col />
  </colgroup>
)

/** 본문 블록 — 목차(편집) + 본문 2행 표 */
export function HwpxBodyContentBlock({
  title,
  onTitleChange,
  readOnly,
  toolbar,
  children,
  className,
  titlePlaceholder = "목차 제목을 입력하세요",
  onTitleFocus,
  embedded = false,
}: {
  title: string
  onTitleChange?: (title: string) => void
  readOnly?: boolean
  toolbar?: ReactNode
  children: ReactNode
  className?: string
  titlePlaceholder?: string
  onTitleFocus?: () => void
  /** 상위 HwpxDocument 안에 이어 붙일 때 */
  embedded?: boolean
}) {
  const table = (
    <>
      {toolbar ? (
        <div className="print-hide border-b border-black/20 bg-[#fafafa]">
          {toolbar}
        </div>
      ) : null}
      <HwpxTable className="table-fixed w-full">
        {HWPX_BODY_COLGROUP}
        <tbody>
          <tr>
            <HwpxLabel className="align-middle">목차</HwpxLabel>
            <HwpxValue>
              <HwpxTextarea
                value={title}
                onChange={onTitleChange}
                onFocus={onTitleFocus}
                readOnly={readOnly}
                placeholder={titlePlaceholder}
                rows={2}
                className="font-semibold"
              />
            </HwpxValue>
          </tr>
          <tr>
            <HwpxLabel className="align-top">본문</HwpxLabel>
            <HwpxValue className="align-top">{children}</HwpxValue>
          </tr>
        </tbody>
      </HwpxTable>
    </>
  )

  if (embedded) {
    return (
      <div className={cn("border-b border-black last:border-b-0", className)}>
        {table}
      </div>
    )
  }

  return (
    <HwpxDocument className={cn("shadow-none", className)}>{table}</HwpxDocument>
  )
}

/** 본문·대목차 등 편집 블록용 한 줄 표 */
export function HwpxContentBlock({
  label,
  children,
  toolbar,
  className,
  embedded = false,
}: {
  label: string
  children: ReactNode
  toolbar?: ReactNode
  className?: string
  embedded?: boolean
}) {
  const table = (
    <>
      {toolbar ? (
        <div className="print-hide border-b border-black/20 bg-[#fafafa]">
          {toolbar}
        </div>
      ) : null}
      <HwpxTable className="table-fixed w-full">
        {HWPX_BODY_COLGROUP}
        <tbody>
          <tr>
            <HwpxLabel className="align-middle">{label}</HwpxLabel>
            <HwpxValue className="align-top">{children}</HwpxValue>
          </tr>
        </tbody>
      </HwpxTable>
    </>
  )

  if (embedded) {
    return (
      <div className={cn("border-b border-black last:border-b-0", className)}>
        {table}
      </div>
    )
  }

  return (
    <HwpxDocument className={cn("shadow-none", className)}>{table}</HwpxDocument>
  )
}
