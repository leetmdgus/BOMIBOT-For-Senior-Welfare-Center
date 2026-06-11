"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useAuth } from "@common/components/auth-provider"
import { Sidebar } from "@common/layouts/sidebar"
import { Header } from "@common/layouts/header"

import { sortDepartmentsByPositionRank } from "@/lib/organization-groups"

import { GroupPanel } from "./group-panel"
import { EmployeeListPanel } from "./employee-list-panel"
import { EmployeeDetailPanel } from "./employee-detail-panel"
import { OrganizationEmployeeCreateDialog } from "./organization-employee-create-dialog"

import { toast } from "@common/hooks/use-toast"
import { isFastApiMode } from "@/lib/api-client"
import {
  getOrganizationContext,
  searchEmployees,
} from "@/services/organization.service"
import {
  CreateEmployeeResult,
  Department,
  DetailTabType,
  Employee,
  OrganizationContext,
  TabType,
} from "@/services/organization.types"

const DEFAULT_DEPARTMENT_GROUP = "management"
const DEFAULT_POSITION_GROUP = "position-social-worker"

function patchEmployeeInGroups(
  groups: Department[],
  updated: Employee,
): Department[] {
  return groups.map((group) => ({
    ...group,
    employees: group.employees.map((employee) =>
      employee.id === updated.id ? { ...employee, ...updated } : employee,
    ),
  }))
}

function addEmployeeToGroups(
  groups: Department[],
  created: Employee,
): Department[] {
  return groups.map((group) => {
    const deptId = created.departmentId
    const matches =
      group.id === deptId ||
      group.name === created.department ||
      (!deptId && group.id !== "all" && group.employees.length === 0)

    if (!matches && group.id !== "all") {
      return group
    }

    if (group.employees.some((e) => e.id === created.id)) {
      return group
    }

    return {
      ...group,
      count: group.count + 1,
      employees: [...group.employees, created],
    }
  })
}

export function OrganizationPage() {
  const searchParams = useSearchParams()
  const { syncFromEmployee } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("department")
  const [departments, setDepartments] = useState<Department[]>([])
  const [positionGroups, setPositionGroups] = useState<Department[]>([])
  const [organizationContext, setOrganizationContext] =
    useState<OrganizationContext | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState(DEFAULT_DEPARTMENT_GROUP)
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([
    DEFAULT_DEPARTMENT_GROUP,
  ])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTabType>("contact")
  const [searchQuery, setSearchQuery] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [openSelfEdit, setOpenSelfEdit] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const reload = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const result = await searchEmployees({ search: searchQuery })
      setDepartments(result.departments)
      setPositionGroups(result.positionGroups)
      setSelectedEmployee((current) => {
        if (!current) {
          return (
            result.employees.find(
              (employee) => employee.id === "emp-management-3",
            ) ??
            result.employees[0] ??
            null
          )
        }
        return (
          result.employees.find((employee) => employee.id === current.id) ??
          result.employees[0] ??
          null
        )
      })
    } finally {
      // 성공·실패 무관하게 로딩 상태를 종료한다. (실패 시에도 무한 스피너 대신
      // 빈 상태/에러 안내가 보이도록 hasLoadedOnce 를 반드시 true 로 만든다.)
      setHasLoadedOnce(true)
      setIsRefreshing(false)
    }
  }, [searchQuery])

  useEffect(() => {
    let cancelled = false

    reload()
      .catch((error) => {
        console.error("조직 데이터 로드 실패:", error)
        if (!cancelled) {
          toast({
            title: "조직 데이터를 불러오지 못했습니다",
            description:
              "잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.",
            variant: "destructive",
          })
        }
      })

    getOrganizationContext()
      .then((context) => {
        if (!cancelled) {
          setOrganizationContext(context)
          if (searchParams.get("me") === "1") {
            if (!context.employeeId) {
              toast({
                title: "내 정보를 연결할 수 없습니다",
                description:
                  "로그인 계정과 조직도 직원이 연결되어 있지 않습니다. 관리자에게 문의해 주세요.",
                variant: "destructive",
              })
            } else {
              void searchEmployees({}).then((result) => {
                const me = result.employees.find(
                  (e) => e.id === context.employeeId,
                )
                if (me) {
                  setSelectedEmployee(me)
                  setOpenSelfEdit(true)
                } else {
                  toast({
                    title: "내 정보를 찾을 수 없습니다",
                    description: "조직도에서 본인 직원 정보를 확인해 주세요.",
                    variant: "destructive",
                  })
                }
              })
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) setOrganizationContext(null)
      })

    return () => {
      cancelled = true
    }
  }, [reload, searchParams])

  const sidebarGroups =
    activeTab === "department" ? departments : positionGroups

  const listGroups = useMemo(() => {
    const isDepartment = activeTab === "department"
    // 부서별(조직도) 보기는 부장 → 팀장 → 사원(실무직) 위계 순으로 정렬한다.
    // 직책별 보기는 이미 POSITION_CATALOG 순서로 그룹핑되어 있어 그대로 둔다.
    const source = isDepartment
      ? sortDepartmentsByPositionRank(departments)
      : positionGroups
    const canAdd = organizationContext?.permissions.canCreateEmployee
    return source.filter(
      (group) =>
        group.id !== "all" &&
        (group.employees.length > 0 || (canAdd && isDepartment)),
    )
  }, [activeTab, departments, positionGroups, organizationContext])

  const handleEmployeeUpdated = useCallback(
    async (updated: Employee) => {
      setDepartments((prev) => patchEmployeeInGroups(prev, updated))
      setPositionGroups((prev) => patchEmployeeInGroups(prev, updated))
      setSelectedEmployee(updated)

      await syncFromEmployee(updated, organizationContext?.employeeId)
    },
    [organizationContext?.employeeId, syncFromEmployee],
  )

  const handleEmployeeCreated = useCallback(
    async (created: CreateEmployeeResult) => {
      if (isFastApiMode()) {
        await reload()
      } else {
        setDepartments((prev) => addEmployeeToGroups(prev, created))
        setPositionGroups((prev) =>
          addEmployeeToGroups(prev, { ...created, department: created.department }),
        )
      }
      setSelectedEmployee(created)
      if (created.departmentId) {
        setExpandedGroupIds((prev) =>
          prev.includes(created.departmentId!)
            ? prev
            : [...prev, created.departmentId!],
        )
      }
      const initialPassword = created.initialPassword ?? created.email
      toast({
        title: "직원이 추가되었습니다",
        description: `로그인 이메일: ${created.email} · 초기 비밀번호: ${initialPassword}`,
      })
    },
    [reload],
  )

  const handleEmployeeDeleted = useCallback(
    async (deleted: Employee) => {
      setSelectedEmployee((current) =>
        current?.id === deleted.id ? null : current,
      )
      await reload()
    },
    [reload],
  )

  const handleDepartmentRenamed = useCallback(() => {
    void reload()
  }, [reload])

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

  if (!hasLoadedOnce && departments.length === 0) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          데이터를 불러오는 중입니다.
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="relative flex-1 overflow-auto">
        <Header />

        {isRefreshing ? (
          <div className="pointer-events-none absolute right-6 top-[4.5rem] z-20 flex items-center gap-2 rounded-md border bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Loader2 className="size-3.5 animate-spin" />
            목록 새로고침 중…
          </div>
        ) : null}

        <div
          className={
            isRefreshing ? "grid grid-cols-[320px_1fr_400px] gap-6 p-6 opacity-90" : "grid grid-cols-[320px_1fr_400px] gap-6 p-6"
          }
        >
          <GroupPanel
            activeTab={activeTab}
            selectedGroupId={selectedGroupId}
            groups={sidebarGroups}
            organizationContext={organizationContext}
            onTabChange={handleTabChange}
            onGroupSelect={handleGroupSelect}
            onDepartmentRenamed={handleDepartmentRenamed}
            onAddEmployee={() => setCreateDialogOpen(true)}
          />

          <EmployeeListPanel
            groups={listGroups}
            expandedGroupIds={expandedGroupIds}
            selectedEmployee={selectedEmployee}
            searchQuery={searchQuery}
            groupByPosition={activeTab === "position"}
            organizationContext={organizationContext}
            onToggleGroup={toggleGroup}
            onSelectEmployee={setSelectedEmployee}
            onSearchChange={setSearchQuery}
            onAddEmployee={() => setCreateDialogOpen(true)}
          />

          <EmployeeDetailPanel
            employee={selectedEmployee}
            detailTab={detailTab}
            organizationContext={organizationContext}
            autoOpenEdit={openSelfEdit}
            onAutoOpenEditHandled={() => setOpenSelfEdit(false)}
            onDetailTabChange={setDetailTab}
            onEmployeeUpdated={handleEmployeeUpdated}
            onEmployeeDeleted={handleEmployeeDeleted}
          />
        </div>

        {organizationContext && (
          <OrganizationEmployeeCreateDialog
            context={organizationContext}
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onCreated={handleEmployeeCreated}
          />
        )}
      </main>
    </div>
  )
}
