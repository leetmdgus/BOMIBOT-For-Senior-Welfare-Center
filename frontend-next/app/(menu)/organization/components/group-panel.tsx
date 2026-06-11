import { useState } from "react"
import {
  Briefcase,
  Building,
  Pencil,
  UserPlus,
  Users,
} from "lucide-react"

import { OrganizationDepartmentEditDialog } from "@menu/organization/components/organization-department-edit-dialog"
import { Button } from "@/components/ui/button"
import { canCreateEmployee, canEditDepartment } from "@/lib/organization-permissions"
import { cn } from "@/lib/utils"

import {
  Department,
  OrganizationContext,
  TabType,
} from "@/services/organization.types"

interface GroupPanelProps {
  activeTab: TabType
  selectedGroupId: string
  groups: Department[]
  organizationContext: OrganizationContext | null
  onTabChange: (tab: TabType) => void
  onGroupSelect: (id: string) => void
  onDepartmentRenamed: (departmentId: string, name: string) => void
  onAddEmployee?: () => void
}

export function GroupPanel({
  activeTab,
  selectedGroupId,
  groups,
  organizationContext,
  onTabChange,
  onGroupSelect,
  onDepartmentRenamed,
  onAddEmployee,
}: GroupPanelProps) {
  const [editDepartment, setEditDepartment] = useState<Department | null>(null)
  const allowDeptEdit = canEditDepartment(
    organizationContext?.permissions ?? null,
  )
  const showAddEmployee =
    Boolean(onAddEmployee) &&
    canCreateEmployee(organizationContext?.permissions ?? null)

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5" />
          그룹
        </h2>
        {showAddEmployee && (
          <Button size="sm" variant="default" onClick={onAddEmployee}>
            <UserPlus className="mr-1 size-4" />
            직원 추가
          </Button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <Button
          variant={activeTab === "department" ? "default" : "outline"}
          size="sm"
          onClick={() => onTabChange("department")}
        >
          <Building className="mr-1 size-4" />
          부서별
        </Button>

        <Button
          variant={activeTab === "position" ? "default" : "outline"}
          size="sm"
          onClick={() => onTabChange("position")}
        >
          <Briefcase className="mr-1 size-4" />
          직책별
        </Button>
      </div>

      <div className="space-y-1">
        {groups.map((group) => (
          <div
            key={group.id}
            className={cn(
              "flex w-full items-center gap-1 rounded-lg text-sm transition-colors",
              selectedGroupId === group.id
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted",
            )}
          >
            <button
              type="button"
              onClick={() => onGroupSelect(group.id)}
              className="flex min-w-0 flex-1 items-center justify-between px-3 py-2.5"
            >
              <span className="truncate">{group.name}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  selectedGroupId === group.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {group.count}
              </span>
            </button>
            {allowDeptEdit && activeTab === "department" && group.id !== "all" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mr-1 size-8 shrink-0"
                aria-label={`${group.name} 부서명 수정`}
                onClick={() => setEditDepartment(group)}
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {editDepartment && (
        <OrganizationDepartmentEditDialog
          department={editDepartment}
          open={Boolean(editDepartment)}
          onOpenChange={(open) => {
            if (!open) setEditDepartment(null)
          }}
          onSaved={(departmentId, name) => {
            onDepartmentRenamed(departmentId, name)
            setEditDepartment(null)
          }}
        />
      )}
    </div>
  )
}
