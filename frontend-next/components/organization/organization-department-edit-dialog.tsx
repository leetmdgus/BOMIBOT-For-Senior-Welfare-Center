"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateDepartment } from "@/services/organization.service"
import type { Department } from "@/services/organization.types"

interface OrganizationDepartmentEditDialogProps {
  department: Department
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (departmentId: string, name: string) => void
}

export function OrganizationDepartmentEditDialog({
  department,
  open,
  onOpenChange,
  onSaved,
}: OrganizationDepartmentEditDialogProps) {
  const [name, setName] = useState(department.name)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(department.name)
      setError(null)
    }
  }, [open, department.name])

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("부서명을 입력해 주세요.")
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await updateDepartment(department.id, { name: trimmed })
      onSaved(department.id, trimmed)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>부서명 수정</DialogTitle>
        </DialogHeader>

        <div className="grid gap-1.5 py-2">
          <Label>부서명</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
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
