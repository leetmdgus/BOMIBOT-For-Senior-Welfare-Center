import {
  Archive,
  File,
  FileSpreadsheet,
  FileText,
  Film,
  Folder,
  Image,
} from "lucide-react"

import type { FileType } from "./file-types"

export const fileIcons: Record<FileType, React.ElementType> = {
  folder: Folder,
  document: FileText,
  image: Image,
  spreadsheet: FileSpreadsheet,
  video: Film,
  pdf: FileText,
  archive: Archive,
  etc: File,
}

export const fileColors: Record<FileType, string> = {
  folder: "text-amber-500",
  document: "text-blue-500",
  image: "text-green-500",
  spreadsheet: "text-emerald-600",
  video: "text-purple-500",
  pdf: "text-red-500",
  archive: "text-orange-500",
  etc: "text-slate-500",
}
