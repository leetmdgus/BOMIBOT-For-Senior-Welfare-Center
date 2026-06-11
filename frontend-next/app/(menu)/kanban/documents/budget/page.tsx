import { redirect } from "next/navigation"

export default function BudgetDocumentsPage() {
  redirect("/kanban/documents?tab=budget")
}
