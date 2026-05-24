import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Employee } from "@/services/organization.types"

function getEmployeeSurname(name: string): string {
  return name.trim().slice(0, 1) || "?"
}

/** public/ 한글 파일명 등 경로 인코딩 */
function toPublicAssetUrl(path: string): string {
  if (!path.startsWith("/")) return path
  return path
    .split("/")
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join("/")
}

interface EmployeeAvatarProps {
  employee: Pick<Employee, "name" | "profileImage">
  className?: string
  fallbackClassName?: string
  variant?: "circle" | "square"
}

export function EmployeeAvatar({
  employee,
  className,
  fallbackClassName,
  variant = "circle",
}: EmployeeAvatarProps) {
  const isSquare = variant === "square"
  const shapeClass = isSquare ? "rounded-xl" : "rounded-full"
  const profileSrc = employee.profileImage
    ? toPublicAssetUrl(employee.profileImage)
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
