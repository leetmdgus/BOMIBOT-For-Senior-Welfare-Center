import {
  Calendar as CalendarIcon,
  DollarSign,
  Layers,
  TrendingUp,
  Users,
} from "lucide-react"

import {
  CalendarEvent,
  ProgressCardData,
  StatCardData,
  VolunteerEvent,
} from "@/services/dashboard.types"

export const statsData: StatCardData[] = [
  {
    label: "인원 현황",
    labelEn: "PERSONNEL STATUS",
    value: "45",
    unit: "명",
    description: "전년 대비 2명 증가 (신규 채용 포함)",
    icon: Users,
    color: "bg-primary/10 text-primary",
    link: "전체 직원 현황 보기",
    goto: "/organization",
  },
  {
    label: "활성 프로젝트",
    labelEn: "ACTIVE PROJECTS",
    value: "12",
    unit: "개",
    description: "2026년도 사업계획 승인 완료 기준",
    icon: Layers,
    color: "bg-primary/10 text-primary",
    link: "사업계획 및 실적 관리",
    goto: "/kanban",
  },
  {
    label: "서비스 이용자",
    labelEn: "SERVICE USERS",
    value: "8,420",
    unit: "명",
    description: "최근 3개월 누적 이용자 추이",
    icon: TrendingUp,
    color: "bg-primary/10 text-primary",
    showChart: true,
  },
]

export const progressData: ProgressCardData[] = [
  {
    label: "인원 달성률",
    value: 85,
    icon: Users,
    color: "bg-primary",
    textColor: "text-primary",
  },
  {
    label: "횟수 달성률",
    value: 92,
    icon: CalendarIcon,
    color: "bg-success",
    textColor: "text-success",
  },
  {
    label: "예산 집행률",
    value: 74,
    icon: DollarSign,
    color: "bg-[hsl(280,60%,50%)]",
    textColor: "text-[hsl(280,60%,50%)]",
  },
]

export const calendarEvents: CalendarEvent[] = [
  {
    day: 1,
    title: "근로자의 날",
    color: "bg-amber-400",
  },
  {
    day: 5,
    title: "어린이날",
    color: "bg-rose-400",
  },
]

export const volunteerEvents: VolunteerEvent[] = [
  {
    id: "v1",
    title: "치매예방 캠페인",
    date: "2026.05.10",
    type: "정기",
  },
]