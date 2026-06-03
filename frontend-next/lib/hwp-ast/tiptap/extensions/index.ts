import Gapcursor from "@tiptap/extension-gapcursor"
import History from "@tiptap/extension-history"

import { HwpDoc } from "@/lib/hwp-ast/tiptap/extensions/hwp-doc"
import { HwpParagraph } from "@/lib/hwp-ast/tiptap/extensions/hwp-paragraph"
import { HwpTable } from "@/lib/hwp-ast/tiptap/extensions/hwp-table"
import { HwpTableCell } from "@/lib/hwp-ast/tiptap/extensions/hwp-table-cell"
import { HwpTableRow } from "@/lib/hwp-ast/tiptap/extensions/hwp-table-row"
import { HwpTextRun } from "@/lib/hwp-ast/tiptap/extensions/hwp-text-run"

/** HWPX AST ↔ TipTap 1:1 스키마 익스텐션 */
export const HWP_AST_TIPTAP_EXTENSIONS = [
  HwpDoc,
  HwpParagraph,
  HwpTextRun,
  HwpTable,
  HwpTableRow,
  HwpTableCell,
  Gapcursor,
  History,
]

export {
  HwpDoc,
  HwpParagraph,
  HwpTextRun,
  HwpTable,
  HwpTableRow,
  HwpTableCell,
}
