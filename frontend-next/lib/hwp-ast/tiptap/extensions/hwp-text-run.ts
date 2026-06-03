import { mergeAttributes, Node } from "@tiptap/core"

/** AST HwpTextRun — attrs.text 1:1 */
export const HwpTextRun = Node.create({
  name: "hwpTextRun",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: {
        default: " ",
        parseHTML: (element) =>
          element.getAttribute("data-text") ??
          element.textContent ??
          " ",
        renderHTML: (attributes) => ({
          "data-text": attributes.text as string,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-hwp-text-run=""]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-hwp-text-run": "" }),
      node.attrs.text || " ",
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const span = document.createElement("span")
      span.setAttribute("data-hwp-text-run", "")
      span.setAttribute("data-text", String(node.attrs.text ?? " "))
      span.contentEditable = "true"
      span.className = "hwp-text-run"
      span.textContent = String(node.attrs.text ?? " ")

      const commit = () => {
        const pos = getPos()
        if (typeof pos !== "number") return
        const next = span.textContent?.replace(/\s+/g, " ").trim() || " "
        editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, { text: next })
          return true
        })
      }

      span.addEventListener("blur", commit)
      span.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          span.blur()
        }
      })

      return {
        dom: span,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "hwpTextRun") return false
          span.textContent = String(updatedNode.attrs.text ?? " ")
          span.setAttribute("data-text", String(updatedNode.attrs.text ?? " "))
          return true
        },
      }
    }
  },
})
