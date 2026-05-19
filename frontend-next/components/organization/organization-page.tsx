"use client"

import { useEffect, useState } from "react"

import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"

import { GroupPanel } from "./group-panel"
import { EmployeeListPanel } from "./employee-list-panel"
import { EmployeeDetailPanel } from "./employee-detail-panel"

import { searchEmployees } from "@/services/organization.service"
import {
  Department,
  DetailTabType,
  Employee,
  TabType,
} from "@/services/organization.types"

export function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<TabType>("department")
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>("management")
  const [expandedDepts, setExpandedDepts] = useState<string[]>(["management"])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTabType>("contact")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    let cancelled = false

    searchEmployees({ search: searchQuery })
      .then((result) => {
        if (cancelled) return

        setDepartments(result.departments)
        setSelectedEmployee((current) => {
          if (
            current &&
            result.employees.some((employee) => employee.id === current.id)
          ) {
            return current
          }

          return result.departments[1]?.employees[0] ?? null
        })
      })
      .catch((error) => {
        console.error("조직 데이터 로드 실패:", error)
      })

    return () => {
      cancelled = true
    }
  }, [searchQuery])

  const toggleDepartment = (deptId: string) => {
    setExpandedDepts((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId]
    )
  }

  if (departments.length === 0) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          데이터를 불러오는 중입니다.
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <Header />

        <div className="grid grid-cols-[320px_1fr_400px] gap-6 p-6">
          <GroupPanel
            activeTab={activeTab}
            selectedDepartment={selectedDepartment}
            onTabChange={setActiveTab}
            onDepartmentSelect={setSelectedDepartment}
            departments={departments}
          />

          <EmployeeListPanel
            departments={departments}
            expandedDepts={expandedDepts}
            selectedEmployee={selectedEmployee}
            searchQuery={searchQuery}
            onToggleDepartment={toggleDepartment}
            onSelectEmployee={setSelectedEmployee}
            onSearchChange={setSearchQuery}
          />

          <EmployeeDetailPanel
            employee={selectedEmployee}
            detailTab={detailTab}
            onDetailTabChange={setDetailTab}
          />
        </div>
      </main>
    </div>
  )
}
