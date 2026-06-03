import { mergeAttributes, Node } from "@tiptap/core"

/** AST HwpParagraphBlock — content: hwpTextRun+ */
export const HwpParagraph = Node.create({
  name: "hwpParagraph",
  group: "hwpBlock",
  content: "hwpTextRun+",

  parseHTML() {
    return [{ tag: 'p[data-hwp-paragraph=""]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes, { "data-hwp-paragraph": "" }), 0]
  },
})
