import {
  Briefcase,
  Calendar,
  Clock,
  FileText,
  Mail,
  Phone,
} from "lucide-react"

import { EmployeeAvatar } from "@/components/organization/employee-avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import {
  DetailTabType,
  Employee,
} from "@/services/organization.types"

interface EmployeeDetailPanelProps {
  employee: Employee | null
  detailTab: DetailTabType
  onDetailTabChange: (tab: DetailTabType) => void
}

export function EmployeeDetailPanel({
  employee,
  detailTab,
  onDetailTabChange,
}: EmployeeDetailPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <FileText className="size-5" />
        직원정보
      </h2>

      {employee ? (
        <>
          <EmployeeProfileHeader employee={employee} />
          <EmployeeInfoCards employee={employee} />

          <EmployeeDetailTabs
            detailTab={detailTab}
            onDetailTabChange={onDetailTabChange}
          />

          {detailTab === "contact" && <ContactInfo employee={employee} />}
          {detailTab === "work" && <WorkInfo employee={employee} />}
          {detailTab === "hr" && <HrInfo />}
        </>
      ) : (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          직원을 선택해주세요
        </div>
      )}
    </div>
  )
}

function EmployeeProfileHeader({ employee }: { employee: Employee }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <EmployeeAvatar
        employee={employee}
        variant="square"
        className="size-16 shrink-0"
        fallbackClassName="text-xl"
      />

      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">
            {employee.name} {employee.role}
          </h3>

          {employee.isAdmin && (
            <Badge className="bg-primary text-primary-foreground">
              Admin
            </Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-primary" />
            {employee.department}
          </span>

          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            춘천북부노인복지관
          </span>
        </div>
      </div>
    </div>
  )
}

function EmployeeInfoCards({ employee }: { employee: Employee }) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
        <Calendar className="size-4 text-muted-foreground" />

        <div>
          <p className="text-xs text-muted-foreground">입사일</p>
          <p className="font-medium">{employee.joinDate}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
        <Clock className="size-4 text-green-500" />

        <div>
          <p className="text-xs text-muted-foreground">근속기간</p>
          <p className="font-medium">{employee.tenure}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
        <Clock className="size-4 text-primary" />

        <div>
          <p className="text-xs text-muted-foreground">최근 로그인</p>
          <p className="font-medium">{employee.lastLogin}</p>
        </div>
      </div>
    </div>
  )
}

function EmployeeDetailTabs({
  detailTab,
  onDetailTabChange,
}: {
  detailTab: DetailTabType
  onDetailTabChange: (tab: DetailTabType) => void
}) {
  const tabs: {
    id: DetailTabType
    label: string
    icon: React.ElementType
  }[] = [
    { id: "contact", label: "연락처 정보", icon: Phone },
    { id: "work", label: "업무 정보", icon: Briefcase },
    { id: "hr", label: "인사현황", icon: FileText },
  ]

  return (
    <div className="mb-4 flex gap-4 border-b border-border">
      {tabs.map((tab) => {
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            onClick={() => onDetailTabChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-1 pb-3 text-sm transition-colors",
              detailTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

function ContactInfo({ employee }: { employee: Employee }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">이메일</p>
        <p className="mt-1 flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          {employee.email}
        </p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">휴대전화</p>
        <p className="mt-1 flex items-center gap-2">
          <Phone className="size-4 text-muted-foreground" />
          {employee.phone}
        </p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">사무실 전화번호</p>
        <p className="mt-1 text-muted-foreground">-</p>
      </div>
    </div>
  )
}

function WorkInfo({ employee }: { employee: Employee }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">소속 부서</p>
        <p className="mt-1 font-medium">{employee.department}</p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">직책</p>
        <p className="mt-1 font-medium">{employee.position}</p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">담당 업무</p>
        <p className="mt-1 text-muted-foreground">-</p>
      </div>
    </div>
  )
}

function HrInfo() {
  return (
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
  )
}