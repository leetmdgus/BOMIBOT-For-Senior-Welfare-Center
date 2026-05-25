"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
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
import { statusStyles } from "./data"
import { getSurveys } from "@/services/kanban.task-detail.service"
import { getSurveyList } from "@/services/survey.service"
import type { Survey } from "@/services/kanban.task-detail.types"

export function SatisfactionSurveyTab() {
  const params = useParams()
  const taskId = typeof params.id === "string" ? params.id : ""
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    responses: 0,
    satisfaction: 0,
  })

  useEffect(() => {
    setSurveys([])
    setStats({ total: 0, active: 0, responses: 0, satisfaction: 0 })
  }, [taskId])

  useEffect(() => {
    if (!taskId) return

    Promise.all([getSurveys(taskId), getSurveyList()])
      .then(([kanbanSurveys, list]) => {
        setSurveys(kanbanSurveys)

        const ids = new Set(kanbanSurveys.map((survey) => survey.id))
        const scoped = list.filter((item) => ids.has(item.id))

        const active = scoped.filter((item) => item.status === "진행중").length
        const responses = scoped.reduce(
          (sum, item) => sum + (item.responseCount ?? 0),
          0,
        )
        const rated = scoped.filter((item) => (item.satisfaction ?? 0) > 0)
        const satisfaction =
          rated.length > 0
            ? rated.reduce((sum, item) => sum + (item.satisfaction ?? 0), 0) /
              rated.length
            : 0

        setStats({
          total: scoped.length,
          active,
          responses,
          satisfaction,
        })
      })
      .catch((error) => {
        console.error("설문 데이터 로드 실패:", error)
      })
  }, [taskId])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">만족도조사</h1>

        <Link
          href={
            taskId
              ? `/survey/new?view=edit&taskId=${encodeURIComponent(taskId)}`
              : "/survey/new?view=edit"
          }
        >
            <Button className="gap-2">
                <Plus className="size-4" />
                설문 만들기
            </Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="size-4" />}
          label="총 설문"
          value={`${stats.total}개`}
        />
        <StatCard
          icon={<TrendingUp className="size-4 text-primary" />}
          label="진행중"
          value={`${stats.active}개`}
        />
        <StatCard
          icon={<Users className="size-4 text-amber-500" />}
          label="총 응답"
          value={`${stats.responses}명`}
        />
        <StatCard
          icon={<Star className="size-4 text-yellow-500" />}
          label="평균 만족도"
          value={`${stats.satisfaction.toFixed(2)}점`}
        />
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
        {surveys.map((survey) => (
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
              <Link href={`/survey/${survey.id}/respond`} target="_blank">
                <Button size="sm">응답하기</Button>
              </Link>
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