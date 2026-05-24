"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

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

const DEFAULT_DEPARTMENT_GROUP = "management"
const DEFAULT_POSITION_GROUP = "position-social-worker"

export function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<TabType>("department")
  const [departments, setDepartments] = useState<Department[]>([])
  const [positionGroups, setPositionGroups] = useState<Department[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState(DEFAULT_DEPARTMENT_GROUP)
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([
    DEFAULT_DEPARTMENT_GROUP,
  ])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTabType>("contact")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    let cancelled = false

    searchEmployees({ search: searchQuery })
      .then((result) => {
        if (cancelled) return

        setDepartments(result.departments)
        setPositionGroups(result.positionGroups)
        setSelectedEmployee((current) => {
          if (
            current &&
            result.employees.some((employee) => employee.id === current.id)
          ) {
            return current
          }

          return (
            result.employees.find(
              (employee) => employee.id === "emp-management-3",
            ) ??
            result.employees[0] ??
            null
          )
        })
      })
      .catch((error) => {
        console.error("조직 데이터 로드 실패:", error)
      })

    return () => {
      cancelled = true
    }
  }, [searchQuery])

  const sidebarGroups =
    activeTab === "department" ? departments : positionGroups

  const listGroups = useMemo(() => {
    const source = activeTab === "department" ? departments : positionGroups
    return source.filter(
      (group) => group.id !== "all" && group.employees.length > 0,
    )
  }, [activeTab, departments, positionGroups])

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
    if (tab === "department") {
      setSelectedGroupId(DEFAULT_DEPARTMENT_GROUP)
      setExpandedGroupIds([DEFAULT_DEPARTMENT_GROUP])
      return
    }
    setSelectedGroupId(DEFAULT_POSITION_GROUP)
    setExpandedGroupIds([DEFAULT_POSITION_GROUP])
  }, [])

  const handleGroupSelect = useCallback((groupId: string) => {
    setSelectedGroupId(groupId)
    if (groupId === "all") {
      if (activeTab === "position") {
        setExpandedGroupIds([DEFAULT_POSITION_GROUP])
      } else {
        setExpandedGroupIds([DEFAULT_DEPARTMENT_GROUP])
      }
      return
    }
    setExpandedGroupIds([groupId])
  }, [activeTab])

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    )
  }, [])

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
            selectedGroupId={selectedGroupId}
            groups={sidebarGroups}
            onTabChange={handleTabChange}
            onGroupSelect={handleGroupSelect}
          />

          <EmployeeListPanel
            groups={listGroups}
            expandedGroupIds={expandedGroupIds}
            selectedEmployee={selectedEmployee}
            searchQuery={searchQuery}
            groupByPosition={activeTab === "position"}
            onToggleGroup={toggleGroup}
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
