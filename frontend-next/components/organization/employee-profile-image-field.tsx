"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2 } from "lucide-react"

import { EmployeeAvatar } from "@/components/organization/employee-avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { uploadEmployeeProfileImage } from "@/services/organization.service"
import type { Employee } from "@/services/organization.types"

type EmployeeProfileImageFieldProps = {
  employee: Pick<Employee, "id" | "name" | "profileImage">
  profileImage: string
  onProfileImageChange: (url: string) => void
  /** 업로드 성공 시 부모 목록·상세 패널 즉시 반영 */
  onUploadComplete?: (url: string) => void
}

export function EmployeeProfileImageField({
  employee,
  profileImage,
  onProfileImageChange,
  onUploadComplete,
}: EmployeeProfileImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewVersion, setPreviewVersion] = useState(0)

  async function handleFileChange(file: File | undefined) {
    if (!file) return
    setIsUploading(true)
    setError(null)
    try {
      const result = await uploadEmployeeProfileImage(employee.id, file)
      const url = result.profileImage ?? ""
      onProfileImageChange(url)
      setPreviewVersion(Date.now())
      onUploadComplete?.(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.")
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="grid gap-2">
      <Label>프로필 사진</Label>
      <div className="flex items-center gap-4">
        <EmployeeAvatar
          employee={{
            name: employee.name,
            profileImage: profileImage || employee.profileImage,
          }}
          className="size-20"
          variant="square"
          imageCacheKey={previewVersion || undefined}
        />
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleFileChange(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {isUploading ? "업로드 중…" : "사진 선택"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WEBP, GIF · 최대 5MB
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
