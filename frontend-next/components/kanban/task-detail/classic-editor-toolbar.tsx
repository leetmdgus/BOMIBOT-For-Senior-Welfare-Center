"use client"

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  Image,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link,
  Link2Off,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Underline,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RichTextEditorHandle } from "@/components/kanban/task-detail/business-plan-rich-text"
import { ColorPaletteButton } from "@/components/kanban/task-detail/rich-text-color-palette"
import { RichTextTableStyleToolbar } from "@/components/kanban/task-detail/rich-text-table-style-toolbar"
import { TableInsertGrid } from "@/components/kanban/task-detail/table-insert-grid"
import { triggerRichTextImageInsert } from "@/lib/rich-text-image-insert"
import { HANGUL_FONT_SIZES_PX } from "@/lib/rich-text-font-size"
import { buildTableHtml } from "@/lib/rich-text-table-utils"
import { cn } from "@/lib/utils"

function ClassicSep() {
  return (
    <span
      className="bp-classic-toolbar__sep mx-0.5 h-5 w-px shrink-0 bg-[#bcbcbc]"
      aria-hidden
    />
  )
}

function ClassicBtn({
  title,
  onClick,
  active,
  disabled,
  children,
}: {
  title: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "bp-classic-toolbar__btn h-[26px] min-w-[26px] shrink-0 rounded-[2px] border border-transparent p-0 text-slate-700 hover:border-[#bcbcbc] hover:bg-white hover:shadow-sm",
        active && "border-[#aaa] bg-white shadow-sm",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </Button>
  )
}

function ClassicRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="bp-classic-toolbar__row flex flex-nowrap items-center gap-px overflow-x-auto px-1 py-[3px]">
      {children}
    </div>
  )
}

/** CKEditor 4 스타일 4단(+) 가로 고정 툴바 */
export function ClassicEditorToolbar({
  onExec,
  onInsertHtml,
  onSourceToggle,
  sourceMode,
  editor,
  onPrepareCommand,
}: {
  onExec: (cmd: string, val?: string) => void
  onInsertHtml: (html: string) => void
  onSourceToggle: () => void
  sourceMode: boolean
  editor?: RichTextEditorHandle | null
  onPrepareCommand?: () => void
}) {
  const inTable = editor?.hasTableContext() ?? false
  const canStyleTable =
    inTable || (editor?.hasCellSelection?.() ?? false)

  return (
    <div className="bp-classic-toolbar">
      <ClassicRow>
        <ClassicBtn title="HTML 소스" onClick={onSourceToggle} active={sourceMode}>
          <Code className="size-3.5" />
        </ClassicBtn>
        <ClassicSep />
        <ClassicBtn title="실행 취소" onClick={() => onExec("undo")}>
          <Undo2 className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="다시 실행" onClick={() => onExec("redo")}>
          <Redo2 className="size-3.5" />
        </ClassicBtn>
        <ClassicSep />
        <ClassicBtn title="잘라내기" onClick={() => onExec("cut")}>
          <span className="text-[11px] font-medium">✂</span>
        </ClassicBtn>
        <ClassicBtn title="복사" onClick={() => onExec("copy")}>
          <span className="text-[11px] font-medium">⎘</span>
        </ClassicBtn>
        <ClassicBtn title="붙여넣기" onClick={() => onExec("paste")}>
          <span className="text-[11px] font-medium">📋</span>
        </ClassicBtn>
        <ClassicSep />
        <ClassicBtn
          title="링크"
          onClick={() => {
            const url = window.prompt("URL", "https://")
            if (url) onExec("createLink", url)
          }}
        >
          <Link className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="링크 제거" onClick={() => onExec("unlink")}>
          <Link2Off className="size-3.5" />
        </ClassicBtn>
        <ClassicSep />
        <ClassicBtn
          title="이미지"
          onClick={() => triggerRichTextImageInsert(onInsertHtml)}
        >
          <Image className="size-3.5" />
        </ClassicBtn>
        <TableInsertGrid
          disabled={sourceMode}
          onInsert={(rows, cols) => {
            if (editor) editor.insertTable(rows, cols)
            else onInsertHtml(buildTableHtml(rows, cols))
          }}
        />
        <ClassicBtn
          title="구분선"
          onClick={() => onInsertHtml("<hr class='my-2 border-gray-300' />")}
        >
          <span className="text-[11px] text-muted-foreground">—</span>
        </ClassicBtn>
        <ClassicSep />
        <ClassicBtn title="전체 선택" onClick={() => onExec("selectAll")}>
          <span className="px-0.5 text-[10px] font-medium">전체</span>
        </ClassicBtn>
      </ClassicRow>

      <ClassicRow>
        <ClassicBtn title="굵게" onClick={() => onExec("bold")}>
          <Bold className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="기울임" onClick={() => onExec("italic")}>
          <Italic className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="밑줄" onClick={() => onExec("underline")}>
          <Underline className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="취소선" onClick={() => onExec("strikeThrough")}>
          <Strikethrough className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="아래첨자" onClick={() => onExec("subscript")}>
          <Subscript className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="위첨자" onClick={() => onExec("superscript")}>
          <Superscript className="size-3.5" />
        </ClassicBtn>
        <ClassicSep />
        <ClassicBtn title="서식 제거" onClick={() => onExec("removeFormat")}>
          <Eraser className="size-3.5" />
        </ClassicBtn>
      </ClassicRow>

      <ClassicRow>
        <ClassicBtn title="번호 목록" onClick={() => onExec("insertOrderedList")}>
          <ListOrdered className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="글머리 목록" onClick={() => onExec("insertUnorderedList")}>
          <List className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn
          title="가. 목록"
          onClick={() =>
            onInsertHtml('<ol class="list-hangul"><li>항목</li></ol>')
          }
        >
          <span className="text-[11px] font-semibold">가.</span>
        </ClassicBtn>
        <ClassicSep />
        <ClassicBtn title="내어쓰기" onClick={() => onExec("outdent")}>
          <IndentDecrease className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="들여쓰기" onClick={() => onExec("indent")}>
          <IndentIncrease className="size-3.5" />
        </ClassicBtn>
        <ClassicSep />
        <ClassicBtn
          title="인용"
          onClick={() => onExec("formatBlock", "blockquote")}
        >
          <span className="text-sm font-serif leading-none">“</span>
        </ClassicBtn>
        <ClassicSep />
        <ClassicBtn title="왼쪽 정렬" onClick={() => onExec("justifyLeft")}>
          <AlignLeft className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="가운데 정렬" onClick={() => onExec("justifyCenter")}>
          <AlignCenter className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="오른쪽 정렬" onClick={() => onExec("justifyRight")}>
          <AlignRight className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn title="양쪽 정렬" onClick={() => onExec("justifyFull")}>
          <AlignJustify className="size-3.5" />
        </ClassicBtn>
      </ClassicRow>

      <ClassicRow>
        <StyleSelect onExec={onExec} onPrepareCommand={onPrepareCommand} />
        <FormatSelect onExec={onExec} onPrepareCommand={onPrepareCommand} />
        <FontSelect onExec={onExec} onPrepareCommand={onPrepareCommand} />
        <SizeSelect onExec={onExec} onPrepareCommand={onPrepareCommand} />
        <ClassicSep />
        <ColorPaletteButton
          label="글자색"
          command="foreColor"
          onExec={onExec}
          trigger={
            <span className="text-[11px] font-bold underline decoration-red-500 decoration-2">
              A
            </span>
          }
        />
        <ColorPaletteButton
          label="배경색"
          command="hiliteColor"
          onExec={onExec}
          trigger={
            <span className="rounded bg-yellow-200 px-0.5 text-[11px] font-bold">
              A
            </span>
          }
        />
      </ClassicRow>

      <ClassicRow>
        <ClassicBtn
          title="표 삭제"
          disabled={!inTable}
          onClick={() => editor?.deleteTable()}
        >
          <Table2 className="size-3.5" />
        </ClassicBtn>
        <ClassicBtn
          title="위에 행"
          disabled={!inTable}
          onClick={() => editor?.insertTableRow("before")}
        >
          <span className="text-[10px]">행↑</span>
        </ClassicBtn>
        <ClassicBtn
          title="아래에 행"
          disabled={!inTable}
          onClick={() => editor?.insertTableRow("after")}
        >
          <span className="text-[10px]">행↓</span>
        </ClassicBtn>
        <ClassicBtn
          title="행 삭제"
          disabled={!inTable}
          onClick={() => editor?.deleteTableRow()}
        >
          <span className="text-[10px]">행−</span>
        </ClassicBtn>
        <ClassicBtn
          title="왼쪽 열"
          disabled={!inTable}
          onClick={() => editor?.insertTableColumn("before")}
        >
          <span className="text-[10px]">열←</span>
        </ClassicBtn>
        <ClassicBtn
          title="오른쪽 열"
          disabled={!inTable}
          onClick={() => editor?.insertTableColumn("after")}
        >
          <span className="text-[10px]">열→</span>
        </ClassicBtn>
        <ClassicBtn
          title="열 삭제"
          disabled={!inTable}
          onClick={() => editor?.deleteTableColumn()}
        >
          <span className="text-[10px]">열−</span>
        </ClassicBtn>
        <ClassicBtn
          title="병합"
          disabled={!editor?.canMergeCellSelection?.()}
          onClick={() => editor?.mergeTableCells()}
        >
          <span className="text-[10px]">병합</span>
        </ClassicBtn>
        <ClassicSep />
        <RichTextTableStyleToolbar
          disabled={!canStyleTable || sourceMode}
          onApplyFill={(color) => editor?.applyTableCellFill(color)}
          onApplyBorder={(border) => editor?.applyTableBorder(border)}
          onApplyBorderToWholeTable={(border) =>
            editor?.applyTableBorderWhole(border)
          }
        />
      </ClassicRow>
    </div>
  )
}

function toolbarSelectTriggerProps(onPrepareCommand?: () => void) {
  return {
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault()
      onPrepareCommand?.()
    },
  }
}

function StyleSelect({
  onExec,
  onPrepareCommand,
}: {
  onExec: (cmd: string, val?: string) => void
  onPrepareCommand?: () => void
}) {
  return (
    <Select onValueChange={(v) => v && onExec("formatBlock", v)}>
      <SelectTrigger
        data-toolbar-select
        {...toolbarSelectTriggerProps(onPrepareCommand)}
        className="bp-classic-toolbar__select h-[26px] w-[92px] border-[#bcbcbc] bg-white text-xs shadow-none"
      >
        <SelectValue placeholder="스타일" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="p">본문</SelectItem>
        <SelectItem value="h2">제목 1</SelectItem>
        <SelectItem value="h3">제목 2</SelectItem>
        <SelectItem value="h4">제목 3</SelectItem>
      </SelectContent>
    </Select>
  )
}

function FormatSelect({
  onExec,
  onPrepareCommand,
}: {
  onExec: (cmd: string, val?: string) => void
  onPrepareCommand?: () => void
}) {
  return (
    <Select onValueChange={(v) => v && onExec("formatBlock", v)}>
      <SelectTrigger
        data-toolbar-select
        {...toolbarSelectTriggerProps(onPrepareCommand)}
        className="bp-classic-toolbar__select h-[26px] w-[92px] border-[#bcbcbc] bg-white text-xs shadow-none"
      >
        <SelectValue placeholder="형식" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="p">문단</SelectItem>
        <SelectItem value="pre">코드</SelectItem>
        <SelectItem value="blockquote">인용</SelectItem>
      </SelectContent>
    </Select>
  )
}

function FontSelect({
  onExec,
  onPrepareCommand,
}: {
  onExec: (cmd: string, val?: string) => void
  onPrepareCommand?: () => void
}) {
  return (
    <Select onValueChange={(v) => onExec("fontName", v)}>
      <SelectTrigger
        data-toolbar-select
        {...toolbarSelectTriggerProps(onPrepareCommand)}
        className="bp-classic-toolbar__select h-[26px] w-[100px] border-[#bcbcbc] bg-white text-xs shadow-none"
      >
        <SelectValue placeholder="글꼴" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Malgun Gothic, sans-serif">맑은 고딕</SelectItem>
        <SelectItem value="Gulim, sans-serif">굴림</SelectItem>
        <SelectItem value="Dotum, sans-serif">돋움</SelectItem>
        <SelectItem value="Batang, serif">바탕</SelectItem>
        <SelectItem value="Arial, sans-serif">Arial</SelectItem>
      </SelectContent>
    </Select>
  )
}

function SizeSelect({
  onExec,
  onPrepareCommand,
}: {
  onExec: (cmd: string, val?: string) => void
  onPrepareCommand?: () => void
}) {
  return (
    <Select onValueChange={(v) => v && onExec("fontSize", v)}>
      <SelectTrigger
        data-toolbar-select
        {...toolbarSelectTriggerProps(onPrepareCommand)}
        className="bp-classic-toolbar__select h-[26px] w-[72px] border-[#bcbcbc] bg-white text-xs shadow-none"
      >
        <SelectValue placeholder="크기" />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {HANGUL_FONT_SIZES_PX.map((px) => (
          <SelectItem key={px} value={`${px}px`}>
            {px}px
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
