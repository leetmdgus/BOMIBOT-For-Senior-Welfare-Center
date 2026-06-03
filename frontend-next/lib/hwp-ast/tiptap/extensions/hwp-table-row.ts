import { mergeAttributes, Node } from "@tiptap/core"

/** AST HwpTableRow */
export const HwpTableRow = Node.create({
  name: "hwpTableRow",
  content: "hwpTableCell+",

  addAttributes() {
    return {
      id: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: "tr[data-hwp-table-row]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["tr", mergeAttributes(HTMLAttributes, { "data-hwp-table-row": "" }), 0]
  },
})
