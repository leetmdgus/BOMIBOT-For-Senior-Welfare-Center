import { mergeAttributes, Node } from "@tiptap/core"

/** AST HwpTableCell — content: (hwpParagraph | hwpTable)+ */
export const HwpTableCell = Node.create({
  name: "hwpTableCell",
  content: "(hwpParagraph | hwpTable)+",

  addAttributes() {
    return {
      id: { default: null },
      rowSpan: { default: 1 },
      colSpan: { default: 1 },
      gridRow: { default: 0 },
      gridCol: { default: 0 },
      backgroundColor: { default: null },
      verticalAlign: { default: "top" },
      header: { default: false },
      hwp: { default: null },
    }
  },

  parseHTML() {
    return [
      { tag: "td[data-hwp-table-cell]" },
      { tag: "th[data-hwp-table-cell]" },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const tag = node.attrs.header ? "th" : "td"
    const style: string[] = []
    if (node.attrs.backgroundColor) {
      style.push(`background-color:${node.attrs.backgroundColor}`)
    }
    if (node.attrs.verticalAlign) {
      style.push(`vertical-align:${node.attrs.verticalAlign}`)
    }
    return [
      tag,
      mergeAttributes(HTMLAttributes, {
        "data-hwp-table-cell": "",
        colspan: node.attrs.colSpan,
        rowspan: node.attrs.rowSpan,
        style: style.length > 0 ? style.join(";") : undefined,
      }),
      0,
    ]
  },
})
