import Link from "next/link"
import {
  Calendar,
  ChevronDown,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  TrendingUp,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { statusStyles, surveysData } from "./data"

export function SatisfactionSurveyTab() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold"></h1>

        <Link href="/survey/new?view=edit">
            <Button className="gap-2">
                <Plus className="size-4" />
                설문 만들기
            </Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard icon={<FileText className="size-4" />} label="총 설문" value="5개" />
        <StatCard icon={<TrendingUp className="size-4 text-primary" />} label="진행중" value="2개" />
        <StatCard icon={<Users className="size-4 text-amber-500" />} label="총 응답" value="123명" />
        <StatCard icon={<Star className="size-4 text-yellow-500" />} label="평균 만족도" value="4.35점" />
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="설문명, 프로그램명 검색..." className="pl-10" />
        </div>

        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="size-4" />
          전체
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {surveysData.map((survey) => (
          <div
            key={survey.id}
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
          >
            <Link href={`/survey/${survey.id}`} className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium transition-colors hover:text-primary">
                  {survey.title}
                </span>

                <Badge className={cn("text-xs", statusStyles[survey.status])}>
                  {survey.status}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {survey.program}
                {survey.date && ` · ${survey.date}`}
              </p>
            </Link>

            <div className="flex items-center gap-3">
              <Link href={`/survey/${survey.id}?view=results`}>
                <Button variant="outline" size="sm">
                  결과 보기
                </Button>
              </Link>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                {survey.endDate}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/survey/${survey.id}?view=preview`}>
                      <Eye className="mr-2 size-4" />
                      미리 보기
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/survey/${survey.id}?view=edit`}>편집</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>설문 중지</DropdownMenuItem>
                  <DropdownMenuItem>설문 복사</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">삭제</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}