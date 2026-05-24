"use client"

import {
  ChevronDown,
  ChevronRight,
  Search,
  Users,
} from "lucide-react"

import { EmployeeAvatar } from "@/components/organization/employee-avatar"
import { Input } from "@/components/ui/input"

import { cn } from "@/lib/utils"

import {
  Department,
  Employee,
} from "@/services/organization.types"

interface EmployeeListPanelProps {
  groups: Department[]
  expandedGroupIds: string[]
  selectedEmployee: Employee | null
  searchQuery: string
  groupByPosition?: boolean
  onToggleGroup: (id: string) => void
  onSelectEmployee: (employee: Employee) => void
  onSearchChange: (value: string) => void
}

export function EmployeeListPanel({
  groups,
  expandedGroupIds,
  selectedEmployee,
  searchQuery,
  groupByPosition = false,
  onToggleGroup,
  onSelectEmployee,
  onSearchChange,
}: EmployeeListPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5" />
          직원 목록
        </h2>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          placeholder="이름·부서·직책 검색"
          value={searchQuery}
          onChange={(e) =>
            onSearchChange(e.target.value)
          }
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {groups
          .filter(
            (group) =>
              group.id !== "all" && group.employees.length > 0,
          )
          .map((group) => (
            <div key={group.id}>
              <button
                onClick={() => onToggleGroup(group.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium hover:bg-muted"
              >
                {expandedGroupIds.includes(group.id) ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}

                <span>{group.name}</span>

                <span className="text-muted-foreground">
                  ({group.count}명)
                </span>
              </button>

              {expandedGroupIds.includes(group.id) && (
                <div className="ml-6 space-y-1">
                  {group.employees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => onSelectEmployee(emp)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        selectedEmployee?.id === emp.id
                          ? "bg-primary/10"
                          : "hover:bg-muted",
                      )}
                    >
                      <EmployeeAvatar
                        employee={emp}
                        className="size-9"
                        fallbackClassName="text-sm"
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{emp.name}</span>
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {groupByPosition ? emp.department : emp.role}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}