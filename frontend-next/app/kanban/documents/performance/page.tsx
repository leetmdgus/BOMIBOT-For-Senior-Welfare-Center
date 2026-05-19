import { redirect } from "next/navigation"

export default function PerformanceDocumentsPage() {
  redirect("/kanban/documents?tab=performance")
}
