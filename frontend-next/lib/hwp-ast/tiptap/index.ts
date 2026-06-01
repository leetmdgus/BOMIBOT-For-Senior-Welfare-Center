export {
  HWP_AST_TIPTAP_EXTENSIONS,
  HwpDoc,
  HwpParagraph,
  HwpTextRun,
  HwpTable,
  HwpTableRow,
  HwpTableCell,
} from "@/lib/hwp-ast/tiptap/extensions"

export {
  hwpBlockToTipTap,
  hwpBlocksToTipTapDoc,
  hwpTableToTipTapDoc,
} from "@/lib/hwp-ast/tiptap/ast-to-tiptap"

export {
  tipTapBlockToHwp,
  tipTapDocToHwpBlocks,
} from "@/lib/hwp-ast/tiptap/tiptap-to-ast"

export {
  htmlToTipTapDoc,
  tipTapDocToHtml,
  richTextHtmlToTipTapDoc,
  tipTapDocToRichTextHtml,
  assertHwpAstTipTapRoundTrip,
} from "@/lib/hwp-ast/tiptap/html-bridge"

/**
 * HWPX AST ↔ TipTap 1:1 매핑
 *
 * | AST (types.ts)     | TipTap node       |
 * |--------------------|-------------------|
 * | doc (implicit)     | doc               |
 * | HwpParagraphBlock  | hwpParagraph      |
 * | HwpTextRun         | hwpTextRun        |
 * | HwpTable           | hwpTable          |
 * | HwpTableRow        | hwpTableRow       |
 * | HwpTableCell       | hwpTableCell      |
 * | HwpColumn[]        | hwpTable.columns  |
 * | cell.style/header  | hwpTableCell.*    |
 */
