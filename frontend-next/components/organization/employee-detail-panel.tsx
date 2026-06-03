import { useEffect, useState } from "react"
import {
  Briefcase,
  Calendar,
  Clock,
  FileText,
  Mail,
  Pencil,
  Phone,
} from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { EmployeeAvatar } from "@/components/organization/employee-avatar"
import { OrganizationEmployeeEditDialog } from "@/components/organization/organization-employee-edit-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { canEditEmployee } from "@/lib/organization-permissions"
import { cn } from "@/lib/utils"

import {
  DetailTabType,
  Employee,
  OrganizationContext,
} from "@/services/organization.types"

interface EmployeeDetailPanelProps {
  employee: Employee | null
  detailTab: DetailTabType
  organizationContext: OrganizationContext | null
  autoOpenEdit?: boolean
  onAutoOpenEditHandled?: () => void
  onDetailTabChange: (tab: DetailTabType) => void
  onEmployeeUpdated: (employee: Employee) => void
}

export function EmployeeDetailPanel({
  employee,
  detailTab,
  organizationContext,
  autoOpenEdit = false,
  onAutoOpenEditHandled,
  onDetailTabChange,
  onEmployeeUpdated,
}: EmployeeDetailPanelProps) {
  const [editOpen, setEditOpen] = useState(false)
  const canEdit =
    employee &&
    organizationContext &&
    canEditEmployee(organizationContext, employee)

  useEffect(() => {
    if (!autoOpenEdit || !canEdit) return
    setEditOpen(true)
    onAutoOpenEditHandled?.()
  }, [autoOpenEdit, canEdit, onAutoOpenEditHandled])

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="size-5" />
          직원정보
        </h2>
        {canEdit && organizationContext && employee && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-1 size-3.5" />
              수정
            </Button>
            <OrganizationEmployeeEditDialog
              employee={employee}
              context={organizationContext}
              open={editOpen}
              onOpenChange={setEditOpen}
              onSaved={onEmployeeUpdated}
            />
          </>
        )}
      </div>

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
          {detailTab === "hr" && <HrInfo employee={employee} />}
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
  const { session } = useAuth()
  const orgName = session?.orgName ?? "복지관"

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
          {employee.isTeamLeader && (
            <Badge variant="secondary">팀장</Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-primary" />
            {employee.department}
          </span>

          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            {orgName}
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

/** 법인명 — 백엔드에 별도 필드가 생기기 전까지 사용하는 기본값 */
const LEGAL_ENTITY_NAME = "사단법인 사랑나눔"

function HrInfo({ employee }: { employee: Employee }) {
  const { session } = useAuth()
  const orgName = session?.orgName ?? "노인복지관"

  const events: {
    date: string
    title: string
    rows: { label: string; value: string }[]
  }[] = [
    {
      date: employee.joinDate || "-",
      title: "입사",
      rows: [
        { label: "부서", value: employee.department || "-" },
        { label: "직책", value: employee.position || "-" },
        { label: "법인", value: LEGAL_ENTITY_NAME },
        { label: "소속", value: orgName },
        { label: "담당업무", value: employee.role || "-" },
      ],
    },
  ]

  return (
    <ol className="relative space-y-6">
      {events.map((event, index) => (
        <li key={`${event.date}-${index}`} className="relative pl-6">
          {/* 타임라인 세로선 (마지막 항목 제외) */}
          {index < events.length - 1 && (
            <span
              aria-hidden
              className="absolute left-1.25 top-2.5 h-full w-px bg-border"
            />
          )}
          {/* 타임라인 점 */}
          <span
            aria-hidden
            className="absolute left-0 top-1 size-2.5 rounded-full border-2 border-primary bg-background"
          />

          <p className="text-xs font-medium text-primary">{event.date}</p>
          <p className="mt-0.5 text-sm font-semibold">{event.title}</p>

          <dl className="mt-2 space-y-1.5">
            {event.rows.map((row) => (
              <div key={row.label} className="flex gap-3 text-sm">
                <dt className="w-16 shrink-0 text-xs leading-5 text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ol>
  )
}