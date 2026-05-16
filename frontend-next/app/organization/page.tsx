"use client"

import { useState } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  Search,
  ChevronDown,
  ChevronRight,
  Users,
  Mail,
  Phone,
  Building,
  Calendar,
  Clock,
  Briefcase,
  FileText,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Employee {
  id: string
  name: string
  role: string
  position: string
  department: string
  email: string
  phone: string
  joinDate: string
  tenure: string
  lastLogin: string
  isAdmin?: boolean
}

interface Department {
  id: string
  name: string
  count: number
  employees: Employee[]
}

const departmentsData: Department[] = [
  {
    id: "all",
    name: "전체 직원",
    count: 30,
    employees: [],
  },
  {
    id: "management",
    name: "운영총괄",
    count: 3,
    employees: [
      {
        id: "emp1",
        name: "최기원",
        role: "관장",
        position: "관장",
        department: "운영총괄",
        email: "choi@welfare.org",
        phone: "010-1234-5678",
        joinDate: "2020-03-15",
        tenure: "6년 2개월",
        lastLogin: "2026-05-11 09:30",
      },
      {
        id: "emp2",
        name: "이혜진",
        role: "부장",
        position: "부장",
        department: "운영총괄",
        email: "lee@welfare.org",
        phone: "010-2345-6789",
        joinDate: "2021-06-01",
        tenure: "4년 11개월",
        lastLogin: "2026-05-11 10:15",
      },
      {
        id: "emp3",
        name: "이승현",
        role: "사회복지사",
        position: "사회복지사",
        department: "운영총괄",
        email: "test@gmail.com",
        phone: "010-9804-8978",
        joinDate: "2026-04-29",
        tenure: "0년 0개월",
        lastLogin: "2026-05-11 21:25",
        isAdmin: true,
      },
    ],
  },
  {
    id: "support",
    name: "운영지원팀",
    count: 6,
    employees: [
      {
        id: "emp4",
        name: "김민수",
        role: "팀장",
        position: "팀장",
        department: "운영지원팀",
        email: "kim@welfare.org",
        phone: "010-3456-7890",
        joinDate: "2022-01-10",
        tenure: "4년 4개월",
        lastLogin: "2026-05-11 08:45",
      },
      {
        id: "emp5",
        name: "박서연",
        role: "대리",
        position: "대리",
        department: "운영지원팀",
        email: "park@welfare.org",
        phone: "010-4567-8901",
        joinDate: "2023-03-20",
        tenure: "3년 1개월",
        lastLogin: "2026-05-10 17:30",
      },
    ],
  },
  {
    id: "welfare1",
    name: "복지1팀",
    count: 5,
    employees: [
      {
        id: "emp6",
        name: "정다은",
        role: "팀장",
        position: "팀장",
        department: "복지1팀",
        email: "jung@welfare.org",
        phone: "010-5678-9012",
        joinDate: "2021-09-01",
        tenure: "4년 8개월",
        lastLogin: "2026-05-11 11:20",
      },
    ],
  },
  {
    id: "welfare2",
    name: "복지2팀",
    count: 6,
    employees: [
      {
        id: "emp7",
        name: "한소희",
        role: "팀장",
        position: "팀장",
        department: "복지2팀",
        email: "han@welfare.org",
        phone: "010-6789-0123",
        joinDate: "2020-11-15",
        tenure: "5년 5개월",
        lastLogin: "2026-05-11 14:00",
      },
    ],
  },
  {
    id: "welfare3",
    name: "복지3팀",
    count: 8,
    employees: [
      {
        id: "emp8",
        name: "윤재호",
        role: "팀장",
        position: "팀장",
        department: "복지3팀",
        email: "yoon@welfare.org",
        phone: "010-7890-1234",
        joinDate: "2019-05-20",
        tenure: "7년 0개월",
        lastLogin: "2026-05-11 16:45",
      },
    ],
  },
  {
    id: "resource",
    name: "자원개발팀",
    count: 2,
    employees: [
      {
        id: "emp9",
        name: "조민경",
        role: "팀장",
        position: "팀장",
        department: "자원개발팀",
        email: "jo@welfare.org",
        phone: "010-8901-2345",
        joinDate: "2022-08-01",
        tenure: "3년 9개월",
        lastLogin: "2026-05-11 13:15",
      },
    ],
  },
]

type TabType = "department" | "position"
type DetailTabType = "contact" | "work" | "hr"

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<TabType>("department")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("management")
  const [expandedDepts, setExpandedDepts] = useState<string[]>(["management"])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    departmentsData[1].employees[2] // 이승현
  )
  const [detailTab, setDetailTab] = useState<DetailTabType>("contact")
  const [searchQuery, setSearchQuery] = useState("")
  const { data: employeesApiData } = useSWR(`/api/employees?search=${searchQuery}`, fetcher)

  const toggleDepartment = (deptId: string) => {
    setExpandedDepts((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId]
    )
  }

  const allEmployees = departmentsData.flatMap((dept) => dept.employees)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-border bg-card px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">조직현황</h1>
              <p className="text-sm text-muted-foreground">
                산하기관 &gt; 춘천북부노인복지관 &gt; 조직현황
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-[320px_1fr_400px] gap-6 p-6">
          {/* Left Panel - Groups */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Users className="size-5" />
              그룹
            </h2>

            {/* Tabs */}
            <div className="mb-4 flex gap-2">
              <Button
                variant={activeTab === "department" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("department")}
                className={cn(
                  activeTab === "department" && "bg-primary text-primary-foreground"
                )}
              >
                <Building className="mr-1 size-4" />
                부서별
              </Button>
              <Button
                variant={activeTab === "position" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("position")}
              >
                <Briefcase className="mr-1 size-4" />
                직책별
              </Button>
            </div>

            {/* Department List */}
            <div className="space-y-1">
              {departmentsData.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDepartment(dept.id)}
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

          {/* Middle Panel - Employee List */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Users className="size-5" />
                직원 목록
              </h2>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="이름·부서·직책 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Employee Tree */}
            <div className="space-y-2">
              {departmentsData
                .filter((dept) => dept.id !== "all" && dept.employees.length > 0)
                .map((dept) => (
                  <div key={dept.id}>
                    <button
                      onClick={() => toggleDepartment(dept.id)}
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
                            onClick={() => setSelectedEmployee(emp)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                              selectedEmployee?.id === emp.id
                                ? "bg-primary/10"
                                : "hover:bg-muted"
                            )}
                          >
                            <Avatar className="size-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {emp.name.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{emp.name}</span>
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

          {/* Right Panel - Employee Details */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <FileText className="size-5" />
              직원정보
            </h2>

            {selectedEmployee ? (
              <>
                {/* Profile Header */}
                <div className="mb-6 flex items-start gap-4">
                  <Avatar className="size-14">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {selectedEmployee.name.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {selectedEmployee.name} {selectedEmployee.role}
                      </h3>
                      {selectedEmployee.isAdmin && (
                        <Badge className="bg-primary text-primary-foreground">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-primary" />
                        {selectedEmployee.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                        춘천북부노인복지관
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                    <Calendar className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">입사일</p>
                      <p className="font-medium">{selectedEmployee.joinDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                    <Clock className="size-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">근속기간</p>
                      <p className="font-medium">{selectedEmployee.tenure}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                    <Clock className="size-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">최근 로그인</p>
                      <p className="font-medium">{selectedEmployee.lastLogin}</p>
                    </div>
                  </div>
                </div>

                {/* Detail Tabs */}
                <div className="mb-4 flex gap-4 border-b border-border">
                  {[
                    { id: "contact", label: "연락처 정보", icon: Phone },
                    { id: "work", label: "업무 정보", icon: Briefcase },
                    { id: "hr", label: "인사현황", icon: FileText },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id as DetailTabType)}
                      className={cn(
                        "flex items-center gap-1.5 border-b-2 px-1 pb-3 text-sm transition-colors",
                        detailTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <tab.icon className="size-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {detailTab === "contact" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">이메일</p>
                      <p className="mt-1 flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        {selectedEmployee.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">휴대전화</p>
                      <p className="mt-1 flex items-center gap-2">
                        <Phone className="size-4 text-muted-foreground" />
                        {selectedEmployee.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">사무실 전화번호</p>
                      <p className="mt-1 text-muted-foreground">-</p>
                    </div>
                  </div>
                )}

                {detailTab === "work" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">소속 부서</p>
                      <p className="mt-1 font-medium">{selectedEmployee.department}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">직책</p>
                      <p className="mt-1 font-medium">{selectedEmployee.position}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">담당 업무</p>
                      <p className="mt-1 text-muted-foreground">-</p>
                    </div>
                  </div>
                )}

                {detailTab === "hr" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">고용 형태</p>
                      <p className="mt-1 font-medium">정규직</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">연차 현황</p>
                      <p className="mt-1 font-medium">15일 중 5일 사용</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">최근 인사 발령</p>
                      <p className="mt-1 text-muted-foreground">-</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                직원을 선택해주세요
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
