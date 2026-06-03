import { Node } from "@tiptap/core"

/** AST 루트 — doc > hwpBlock+ */
export const HwpDoc = Node.create({
  name: "doc",
  topNode: true,
  content: "hwpBlock+",
})
