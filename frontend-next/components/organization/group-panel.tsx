import {
  Briefcase,
  Building,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  Department,
  TabType,
} from "@/services/organization.types"

interface GroupPanelProps {
  activeTab: TabType
  selectedDepartment: string
  departments: Department[]
  onTabChange: (tab: TabType) => void
  onDepartmentSelect: (id: string) => void
}

export function GroupPanel({
  activeTab,
  selectedDepartment,
  departments,
  onTabChange,
  onDepartmentSelect,
}: GroupPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Users className="size-5" />
        그룹
      </h2>

      <div className="mb-4 flex gap-2">
        <Button
          variant={
            activeTab === "department"
              ? "default"
              : "outline"
          }
          size="sm"
          onClick={() => onTabChange("department")}
        >
          <Building className="mr-1 size-4" />
          부서별
        </Button>

        <Button
          variant={
            activeTab === "position"
              ? "default"
              : "outline"
          }
          size="sm"
          onClick={() => onTabChange("position")}
        >
          <Briefcase className="mr-1 size-4" />
          직책별
        </Button>
      </div>

      <div className="space-y-1">
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() =>
              onDepartmentSelect(dept.id)
            }
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
              selectedDepartment === dept.id
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            <span>{dept.name}</span>

            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                selectedDepartment === dept.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {dept.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}