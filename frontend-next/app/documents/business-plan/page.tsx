import { BusinessPlanFilters } from "@/components/documents/business-plan-filters"
import { BusinessPlanContent } from "@/components/documents/business-plan-content"

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