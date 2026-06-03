"use client"

import { useMemo } from "react"

import {
  HWPX_PREVIEW_THEME_CSS,
  OFFICE_HWPX_PREVIEW_CSS,
} from "@/lib/hwp-ast/preview-theme"
import {
  OFFICE_PREVIEW_STYLES,
} from "@/lib/files/office-preview"
import { cn } from "@/lib/utils"

type OfficePreviewContentProps = {
  html: string
  className?: string
}

function stripEmbeddedStyleTags(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "")
}

function needsOfficeBaseStyles(html: string): boolean {
  return !/<style[\s\S]*?office-preview/i.test(html)
}

/** Excel·HWPX 서버/클라이언트 렌더 HTML */
export function OfficePreviewContent({
  html,
  className,
}: OfficePreviewContentProps) {
  const isHwpx = html.includes("hwpx-doc")
  const bodyHtml = useMemo(
    () => (isHwpx ? stripEmbeddedStyleTags(html) : html),
    [html, isHwpx],
  )
  const injectOfficeStyles = !isHwpx && needsOfficeBaseStyles(html)

  return (
    <>
      {isHwpx ? (
        <style
          dangerouslySetInnerHTML={{
            __html: HWPX_PREVIEW_THEME_CSS + OFFICE_HWPX_PREVIEW_CSS,
          }}
        />
      ) : injectOfficeStyles ? (
        <div dangerouslySetInnerHTML={{ __html: OFFICE_PREVIEW_STYLES }} />
      ) : null}
      <div
        className={cn(
          "office-preview-host min-h-0 overflow-auto",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </>
  )
}
