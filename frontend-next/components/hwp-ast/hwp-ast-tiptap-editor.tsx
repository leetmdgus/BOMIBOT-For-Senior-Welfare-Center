"use client"

import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import type { JSONContent } from "@tiptap/core"

import { hwpBlocksToTipTapDoc } from "@/lib/hwp-ast/tiptap/ast-to-tiptap"
import { HWP_AST_TIPTAP_EXTENSIONS } from "@/lib/hwp-ast/tiptap/extensions"
import { tipTapDocToHwpBlocks } from "@/lib/hwp-ast/tiptap/tiptap-to-ast"
import type { HwpBlock } from "@/lib/hwp-ast/types"
import { cn } from "@/lib/utils"

type HwpAstTipTapEditorProps = {
  blocks: HwpBlock[]
  onChange?: (blocks: HwpBlock[]) => void
  readOnly?: boolean
  className?: string
  placeholder?: string
}

/**
 * HWPX AST 1:1 TipTap 편집기.
 * blocks ↔ TipTap doc JSON ↔ AST 왕복 변환.
 */
export function HwpAstTipTapEditor({
  blocks,
  onChange,
  readOnly = false,
  className,
  placeholder = "내용을 입력하세요…",
}: HwpAstTipTapEditorProps) {
  const editor = useEditor({
    extensions: HWP_AST_TIPTAP_EXTENSIONS,
    content: hwpBlocksToTipTapDoc(blocks),
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange?.(tipTapDocToHwpBlocks(ed.getJSON()))
    },
    editorProps: {
      attributes: {
        class: cn(
          "hwp-ast-tiptap min-h-[6rem] max-w-none outline-none",
          "font-[family-name:var(--font-sans,'Malgun_Gothic','맑은_고딕',sans-serif)]",
        ),
        "data-placeholder": placeholder,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!readOnly)
  }, [editor, readOnly])

  useEffect(() => {
    if (!editor) return
    const next = hwpBlocksToTipTapDoc(blocks)
    const current = editor.getJSON()
    if (jsonEqual(current, next)) return
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, blocks])

  if (!editor) {
    return (
      <div className={cn("min-h-[6rem] animate-pulse rounded bg-muted/40", className)} />
    )
  }

  return (
    <div className={cn("hwp-ast-tiptap-root rounded border bg-white p-3", className)}>
      <EditorContent editor={editor} />
    </div>
  )
}

function jsonEqual(a: JSONContent, b: JSONContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
