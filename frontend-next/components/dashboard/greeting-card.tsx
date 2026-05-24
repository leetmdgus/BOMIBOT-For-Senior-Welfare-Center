import { Card, CardContent } from "@/components/ui/card"
import { EmployeeAvatar } from "@/components/organization/employee-avatar"
import { CURRENT_USER } from "@/lib/constants/current-user"

interface GreetingCardProps {
  currentTime: Date
}

export function GreetingCard({ currentTime }: GreetingCardProps) {
  return (
    <Card className="mb-6 overflow-hidden">
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <EmployeeAvatar
            employee={CURRENT_USER}
            className="size-12"
            fallbackClassName="text-lg"
          />

          <div>
            <h3 className="text-xl font-semibold">
              {CURRENT_USER.name} {CURRENT_USER.role}님 안녕하세요.
            </h3>

            <p className="text-muted-foreground">
              오늘도 힘찬 하루 되세요! 기관 운영 현황을 요약해 드립니다.
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
            {formatTime(currentTime)}
          </p>

          <p className="mt-1 text-sm text-primary">
            {formatDate(currentTime)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })
}
