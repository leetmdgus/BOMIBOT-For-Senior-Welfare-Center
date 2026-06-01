import { mergeAttributes, Node } from "@tiptap/core"

/** AST HwpTable — attrs.columns / hwp 1:1 */
export const HwpTable = Node.create({
  name: "hwpTable",
  group: "hwpBlock",
  content: "hwpTableRow+",
  isolating: true,

  addAttributes() {
    return {
      id: { default: null },
      columns: { default: [] as Array<{ width: number }> },
      hwp: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'table[data-hwp-table=""]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "table",
      mergeAttributes(HTMLAttributes, {
        "data-hwp-table": "",
        class: "hwp-ast-table bp-rt-table",
        style: "width:100%;border-collapse:collapse;table-layout:fixed",
      }),
      0,
    ]
  },
})
