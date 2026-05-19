import { cn } from "@/lib/utils"

export function PrintArea({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("print-area", className)}>{children}</div>
}
