export type {
  HwpBlock,
  HwpColumn,
  HwpDocumentMeta,
  HwpHeaderFooter,
  HwpPageLayout,
  HwpParagraphBlock,
  HwpTable,
  HwpTableCell,
  HwpTableRow,
  HwpTextRun,
} from "@/lib/hwp-ast/types"
export {
  DEFAULT_HWP_PAGE,
  HWP_TABLE_WIDTH_HWPUNIT,
} from "@/lib/hwp-ast/types"

export {
  getCellWidth,
  neededColumnCount,
  normalizeTableGrid,
} from "@/lib/hwp-ast/normalizeTableGrid"

export {
  htmlTableToAst,
  htmlToHwpBlocks,
  paragraphTextFromBlocks,
  type HtmlHwpxBlocks,
} from "@/lib/hwp-ast/htmlTableToAst"

export { astTableToHtml } from "@/lib/hwp-ast/astTableToHtml"
export { astToHwpxTable, hwpTablesToHwpx } from "@/lib/hwp-ast/astToHwpxTable"

export { wrapHwpxPageHtml } from "@/lib/hwp-ast/pageCanvas"

export { htmlToOrderedHwpBlocks } from "@/lib/hwp-ast/orderedHtmlBlocks"

export {
  HWP_AST_TIPTAP_EXTENSIONS,
  hwpBlockToTipTap,
  hwpBlocksToTipTapDoc,
  hwpTableToTipTapDoc,
  tipTapBlockToHwp,
  tipTapDocToHwpBlocks,
  htmlToTipTapDoc,
  tipTapDocToHtml,
  richTextHtmlToTipTapDoc,
  tipTapDocToRichTextHtml,
  assertHwpAstTipTapRoundTrip,
} from "@/lib/hwp-ast/tiptap"
