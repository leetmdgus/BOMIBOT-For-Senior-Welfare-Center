import { redirect } from "next/navigation"

export default function BusinessPlanDocumentsPage() {
  redirect("/kanban/documents?tab=business-plan")
}
