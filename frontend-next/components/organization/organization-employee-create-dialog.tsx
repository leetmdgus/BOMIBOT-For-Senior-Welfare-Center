"use client"

import { useEffect, useState } from "react"
import { UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { canAssignTeamLeader } from "@/lib/organization-permissions"
import {
  createEmployee,
  getDepartmentOptions,
} from "@/services/organization.service"
import type {
  CreateEmployeeInput,
  DepartmentOption,
  Employee,
  OrganizationContext,
} from "@/services/organization.types"

interface OrganizationEmployeeCreateDialogProps {
  context: OrganizationContext
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (employee: Employee) => void
}

const EMPTY_FORM: CreateEmployeeInput = {
  name: "",
  departmentId: "",
  email: "",
  role: "",
  position: "",
  phone: "",
  joinDate: "",
  profileImage: "",
  isTeamLeader: false,
  isAdmin: false,
}

export function OrganizationEmployeeCreateDialog({
  context,
  open,
  onOpenChange,
  onCreated,
}: OrganizationEmployeeCreateDialogProps) {
  const [form, setForm] = useState<CreateEmployeeInput>(EMPTY_FORM)
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showTeamLeaderToggle = canAssignTeamLeader(context.permissions)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(EMPTY_FORM)
    getDepartmentOptions()
      .then((opts) => {
        setDepartments(opts)
        const lockDept =
          context.permissions.isTeamLeader &&
          !context.permissions.isAdmin &&
          !context.permissions.isManagement
        if (lockDept) {
          const match = opts.find((d) => d.name === context.department)
          if (match) {
            setForm((prev) => ({ ...prev, departmentId: match.id }))
          }
        }
      })
      .catch(() => setDepartments([]))
  }, [open, context.department, context.permissions])

  async function handleSave() {
    const name = form.name.trim()
    const email = form.email.trim()
    const departmentId = form.departmentId.trim()
    if (!name || !email || !departmentId) {
      setError("이름, 이메일, 부서는 필수입니다.")
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const payload: CreateEmployeeInput = {
        name,
        departmentId,
        email,
        role: form.role?.trim() || undefined,
        position: form.position?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        joinDate: form.joinDate?.trim() || undefined,
        profileImage: form.profileImage?.trim() || undefined,
      }
      if (showTeamLeaderToggle) {
        payload.isTeamLeader = form.isTeamLeader
        payload.isAdmin = form.isAdmin
      }
      const created = await createEmployee(payload)
      onCreated(created)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "추가에 실패했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4" />
            직원 추가
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <Field label="이름 *">
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </Field>

          <Field label="직책 (표시)">
            <Input
              value={form.role ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            />
          </Field>

          <Field label="직위">
            <Input
              value={form.position ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, position: e.target.value }))
              }
            />
          </Field>

          <Field label="소속 부서 *">
            <Select
              value={form.departmentId || ""}
              onValueChange={(departmentId) =>
                setForm((prev) => ({ ...prev, departmentId }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="부서 선택" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="이메일 *">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </Field>

          <Field label="휴대전화">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </Field>

          <Field label="입사일">
            <Input
              type="date"
              value={form.joinDate ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, joinDate: e.target.value }))
              }
            />
          </Field>

          <Field label="프로필 사진 경로">
            <Input
              placeholder="/이름_증명사진.jpg"
              value={form.profileImage ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, profileImage: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              public 폴더 기준 경로 (예: /이승현_증명사진.jpg)
            </p>
          </Field>

          {showTeamLeaderToggle && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">관리자 설정</p>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(form.isTeamLeader)}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      isTeamLeader: checked === true,
                    }))
                  }
                />
                팀장으로 지정
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(form.isAdmin)}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      isAdmin: checked === true,
                    }))
                  }
                />
                조직 Admin
              </label>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "추가 중…" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
