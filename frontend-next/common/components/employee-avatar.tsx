import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { resolveProfileImageSrc } from "@/lib/organization/profile-image-src"
import { cn } from "@/lib/utils"
import type { Employee } from "@/services/organization.types"

function getEmployeeSurname(name: string): string {
  return name.trim().slice(0, 1) || "?"
}

interface EmployeeAvatarProps {
  employee: Pick<Employee, "name" | "profileImage">
  className?: string
  fallbackClassName?: string
  variant?: "circle" | "square"
  /** 업로드 직후 이미지 캐시 무효화 */
  imageCacheKey?: string | number
}

export function EmployeeAvatar({
  employee,
  className,
  fallbackClassName,
  variant = "circle",
  imageCacheKey,
}: EmployeeAvatarProps) {
  const isSquare = variant === "square"
  const shapeClass = isSquare ? "rounded-xl" : "rounded-full"
  const profileSrc = employee.profileImage
    ? resolveProfileImageSrc(employee.profileImage, {
        cacheBust: imageCacheKey,
      })
    : undefined

  return (
    <Avatar className={cn(shapeClass, className)}>
      {profileSrc ? (
        <AvatarImage
          src={profileSrc}
          alt={employee.name}
          className={cn("object-cover", shapeClass)}
        />
      ) : null}
      <AvatarFallback
        delayMs={0}
        className={cn(
          "bg-sky-100 font-semibold text-sky-600",
          shapeClass,
          fallbackClassName,
        )}
      >
        {getEmployeeSurname(employee.name)}
      </AvatarFallback>
    </Avatar>
  )
}
