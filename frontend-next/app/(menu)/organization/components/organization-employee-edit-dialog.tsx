"use client"

import { useEffect, useState } from "react"
import { Pencil } from "lucide-react"

import { EmployeeProfileImageField } from "@menu/organization/components/employee-profile-image-field"
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
import { useAuth } from "@common/components/auth-provider"
import {
  canAssignTeamLeader,
  canFullHrEdit,
  isSelfEmployee,
  isSelfProfileEdit,
} from "@/lib/organization-permissions"
import { changePassword } from "@/services/auth.service"
import {
  getDepartmentOptions,
  updateEmployee,
} from "@/services/organization.service"
import type {
  DepartmentOption,
  Employee,
  OrganizationContext,
  UpdateEmployeeInput,
} from "@/services/organization.types"

interface OrganizationEmployeeEditDialogProps {
  employee: Employee
  context: OrganizationContext
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (employee: Employee) => void
}

export function OrganizationEmployeeEditDialog({
  employee,
  context,
  open,
  onOpenChange,
  onSaved,
}: OrganizationEmployeeEditDialogProps) {
  const { syncFromEmployee } = useAuth()
  const [form, setForm] = useState<UpdateEmployeeInput>({})
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const selfOnly = isSelfProfileEdit(context, employee)
  const isMe = isSelfEmployee(context, employee)
  const fullHr = canFullHrEdit(context, employee)
  const showTeamLeaderToggle = canAssignTeamLeader(context.permissions)
  const wantsPasswordChange =
    Boolean(currentPassword || newPassword || confirmPassword)

  useEffect(() => {
    if (!open) return
    setForm({
      name: employee.name,
      role: employee.role,
      position: employee.position,
      departmentId: employee.departmentId,
      email: employee.email,
      phone: employee.phone,
      joinDate: employee.joinDate,
      profileImage: employee.profileImage ?? "",
      isTeamLeader: employee.isTeamLeader ?? false,
      isAdmin: employee.isAdmin ?? false,
    })
    setError(null)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    if (fullHr) {
      getDepartmentOptions()
        .then(setDepartments)
        .catch(() => setDepartments([]))
    }
  }, [open, employee, fullHr])

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    try {
      if (isMe && wantsPasswordChange) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          throw new Error("비밀번호 변경 시 세 필드를 모두 입력해 주세요.")
        }
        if (newPassword !== confirmPassword) {
          throw new Error("새 비밀번호 확인이 일치하지 않습니다.")
        }
        if (newPassword.length < 6) {
          throw new Error("새 비밀번호는 6자 이상이어야 합니다.")
        }
        await changePassword({
          currentPassword,
          newPassword,
        })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }

      const payload: UpdateEmployeeInput = {
        name: form.name?.trim(),
        email: form.email?.trim(),
        phone: form.phone?.trim(),
      }

      const nextProfile = form.profileImage?.trim() ?? ""
      const prevProfile = employee.profileImage?.trim() ?? ""
      if (nextProfile !== prevProfile) {
        payload.profileImage = nextProfile
      }

      if (fullHr) {
        payload.role = form.role?.trim()
        payload.position = form.position?.trim()
        payload.departmentId = form.departmentId
        payload.joinDate = form.joinDate?.trim()
        if (showTeamLeaderToggle) {
          payload.isTeamLeader = form.isTeamLeader
          payload.isAdmin = form.isAdmin
        }
      }

      const updated = await updateEmployee(employee.id, payload)
      await syncFromEmployee(updated, context.employeeId)
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" />
            {selfOnly ? "내 정보 수정" : "직원 정보 수정"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <EmployeeProfileImageField
            employee={employee}
            profileImage={form.profileImage ?? ""}
            onProfileImageChange={(url) =>
              setForm((prev) => ({ ...prev, profileImage: url }))
            }
            onUploadComplete={(url) => {
              const withPhoto = { ...employee, profileImage: url }
              void syncFromEmployee(withPhoto, context.employeeId)
              onSaved(withPhoto)
            }}
          />

          <Field label="이름">
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </Field>

          {fullHr && (
            <>
              <Field label="직책 (표시)">
                <Input
                  value={form.role ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, role: e.target.value }))
                  }
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

              <Field label="소속 부서">
                <Select
                  value={form.departmentId ?? ""}
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
            </>
          )}

          {!fullHr && selfOnly && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              소속·직책·입사일은 관리자 또는 팀장만 변경할 수 있습니다.
            </p>
          )}

          <Field label="이메일 (로그인 ID)">
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              변경 시 로그인에 사용하는 이메일도 함께 바뀝니다. 비밀번호는 그대로 유지됩니다.
            </p>
          </Field>

          <Field label="휴대전화">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </Field>

          {fullHr && (
            <Field label="입사일">
              <Input
                type="date"
                value={form.joinDate ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, joinDate: e.target.value }))
                }
              />
            </Field>
          )}

          {isMe && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">비밀번호 변경</p>
              <p className="text-xs text-muted-foreground">
                변경하지 않으려면 비워 두세요. 저장 시 프로필과 함께 반영됩니다.
              </p>
              <Field label="현재 비밀번호">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </Field>
              <Field label="새 비밀번호 (6자 이상)">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>
              <Field label="새 비밀번호 확인">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
            </div>
          )}

          {showTeamLeaderToggle && fullHr && (
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
            {isSaving ? "저장 중…" : "저장"}
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
