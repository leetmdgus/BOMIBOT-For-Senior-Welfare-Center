export type EvidenceTreeNode = {
  id: string
  name: string
  path: string
  type: "folder" | "file"
  children?: EvidenceTreeNode[]
  file?: File
  size?: number
}

const DOCUMENT_EXTENSIONS = new Set([
  ".hwpx",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".csv",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".hwp",
])

export function isEvidenceDocumentFile(name: string): boolean {
  const lower = name.toLowerCase()
  const dot = lower.lastIndexOf(".")
  if (dot < 0) return false
  return DOCUMENT_EXTENSIONS.has(lower.slice(dot))
}

function normalizeRelativePath(file: File): string {
  const relative =
    (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
    file.name
  return relative.replace(/\\/g, "/")
}

export function buildEvidenceTreeFromFiles(files: File[]): EvidenceTreeNode {
  const root: EvidenceTreeNode = {
    id: "root",
    name: "증빙문서",
    path: "",
    type: "folder",
    children: [],
  }

  const documentFiles = files.filter((file) =>
    isEvidenceDocumentFile(normalizeRelativePath(file)),
  )

  for (const file of documentFiles) {
    const relativePath = normalizeRelativePath(file)
    const segments = relativePath.split("/").filter(Boolean)
    if (segments.length === 0) continue

    let current = root
    let pathSoFar = ""

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]
      const isLast = index === segments.length - 1
      pathSoFar = pathSoFar ? `${pathSoFar}/${segment}` : segment

      if (isLast) {
        current.children = current.children ?? []
        current.children.push({
          id: pathSoFar,
          name: segment,
          path: pathSoFar,
          type: "file",
          file,
          size: file.size,
        })
        continue
      }

      current.children = current.children ?? []
      let folder = current.children.find(
        (child) => child.type === "folder" && child.name === segment,
      )

      if (!folder) {
        folder = {
          id: pathSoFar,
          name: segment,
          path: pathSoFar,
          type: "folder",
          children: [],
        }
        current.children.push(folder)
      }

      current = folder
    }
  }

  sortEvidenceTree(root)
  return root
}

function sortEvidenceTree(node: EvidenceTreeNode): void {
  if (!node.children?.length) return

  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1
    return a.name.localeCompare(b.name, "ko")
  })

  for (const child of node.children) {
    if (child.type === "folder") sortEvidenceTree(child)
  }
}

export function flattenEvidenceFiles(node: EvidenceTreeNode): EvidenceTreeNode[] {
  const result: EvidenceTreeNode[] = []

  const walk = (current: EvidenceTreeNode) => {
    if (current.type === "file" && current.file) {
      result.push(current)
      return
    }
    for (const child of current.children ?? []) {
      walk(child)
    }
  }

  walk(node)
  return result
}

export function countEvidenceTree(node: EvidenceTreeNode): {
  folders: number
  files: number
} {
  let folders = 0
  let files = 0

  const walk = (current: EvidenceTreeNode) => {
    if (current.id === "root") {
      for (const child of current.children ?? []) walk(child)
      return
    }
    if (current.type === "folder") {
      folders += 1
      for (const child of current.children ?? []) walk(child)
      return
    }
    files += 1
  }

  walk(node)
  return { folders, files }
}
