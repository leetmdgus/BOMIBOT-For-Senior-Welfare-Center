"use client"

import {
  ChevronDown,
  ChevronRight,
  Search,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"

import { cn } from "@/lib/utils"

import {
  Department,
  Employee,
} from "@/services/organization.types"

interface EmployeeListPanelProps {
  departments: Department[]
  expandedDepts: string[]
  selectedEmployee: Employee | null
  searchQuery: string
  onToggleDepartment: (id: string) => void
  onSelectEmployee: (employee: Employee) => void
  onSearchChange: (value: string) => void
}

export function EmployeeListPanel({
  departments,
  expandedDepts,
  selectedEmployee,
  searchQuery,
  onToggleDepartment,
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
        {departments
          .filter(
            (dept) =>
              dept.id !== "all" &&
              dept.employees.length > 0
          )
          .map((dept) => (
            <div key={dept.id}>
              <button
                onClick={() =>
                  onToggleDepartment(dept.id)
                }
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium hover:bg-muted"
              >
                {expandedDepts.includes(dept.id) ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}

                <span>{dept.name}</span>

                <span className="text-muted-foreground">
                  ({dept.count}명)
                </span>
              </button>

              {expandedDepts.includes(dept.id) && (
                <div className="ml-6 space-y-1">
                  {dept.employees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() =>
                        onSelectEmployee(emp)
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        selectedEmployee?.id === emp.id
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      )}
                    >
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-sm text-primary">
                          {emp.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {emp.name}
                          </span>
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {emp.role}
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