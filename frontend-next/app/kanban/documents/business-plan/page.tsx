import { BusinessPlanContent } from "@/components/kanban/documents/business-plan-content";
import { BusinessPlanFilters } from "@/components/kanban/documents/business-plan-filters";

export default function BusinessPlanPage() {
  return (
    <>
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <BusinessPlanFilters />
      </div>

      <BusinessPlanContent />
    </>
  )
}