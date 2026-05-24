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
  // 5월 4일
  { day: 4, title: "전체 주간업무회의", color: "bg-rose-500", category: "welfare" },
  // 5월 5일
  { day: 5, title: "화요모임", color: "bg-rose-500", category: "welfare" },
  // 5월 6일
  { day: 6, title: "주원여사회 어버이...", color: "bg-rose-500", category: "welfare" },
  { day: 6, title: "[BBC] 정기모임", color: "bg-rose-500", category: "welfare" },
  // 5월 7일
  { day: 7, title: "주원공헌당식(전원...", color: "bg-rose-500", category: "welfare" },
  { day: 7, title: "복지3팀 회의", color: "bg-emerald-500", category: "team" },
  { day: 7, title: "노인복지관 현장점검", color: "bg-rose-500", category: "welfare" },
  // 5월 8일
  { day: 8, title: "복지관 어버이날", color: "bg-rose-500", category: "welfare" },
  { day: 8, title: "춘천시어버이날기...", color: "bg-rose-500", category: "welfare" },
  // 5월 11일
  { day: 11, title: "강진영 연차", color: "bg-rose-500", category: "welfare" },
  { day: 11, title: "스승의날 기념(노...", color: "bg-rose-500", category: "welfare" },
  { day: 11, title: "복지관 시설 점검", color: "bg-rose-500", category: "welfare" },
  { day: 11, title: "사회복지사 교육", color: "bg-rose-500", category: "welfare" },
  // 5월 12일
  { day: 12, title: "관장님 연차(체결...", color: "bg-rose-500", category: "welfare" },
  { day: 12, title: "화요모임", color: "bg-rose-500", category: "welfare" },
  // 5월 13일
  { day: 13, title: "[BBC] 회의", color: "bg-rose-500", category: "welfare" },
  { day: 13, title: "주원공헌당식(전국...", color: "bg-rose-500", category: "welfare" },
  { day: 13, title: "복지관 프로그램 기획", color: "bg-rose-500", category: "welfare" },
  // 5월 14일
  { day: 14, title: "복지3팀 회의", color: "bg-emerald-500", category: "team" },
  { day: 14, title: "전통대 AI재활관련...", color: "bg-rose-500", category: "welfare" },
  // 5월 15일
  { day: 15, title: "관장님 연차", color: "bg-rose-500", category: "welfare" },
  { day: 15, title: "체결중심회교학회...", color: "bg-rose-500", category: "welfare" },
  // 5월 18일
  { day: 18, title: "전체 주간업무회의", color: "bg-rose-500", category: "welfare" },
  { day: 18, title: "의료, 간호영역에서...", color: "bg-rose-500", category: "welfare" },
  { day: 18, title: "복지관 월간 보고", color: "bg-rose-500", category: "welfare" },
  // 5월 19일
  { day: 19, title: "사전투표 모의시험", color: "bg-rose-500", category: "welfare" },
  { day: 19, title: "강진영 재택근무", color: "bg-rose-500", category: "welfare" },
  { day: 19, title: "복지3팀 회의", color: "bg-emerald-500", category: "team" },
  { day: 19, title: "노인복지 정책 설명회", color: "bg-rose-500", category: "welfare" },
  { day: 19, title: "프로그램 운영 회의", color: "bg-rose-500", category: "welfare" },
  { day: 19, title: "자원봉사자 교육", color: "bg-rose-500", category: "welfare" },
  // 5월 20일
  { day: 20, title: "가시박 사전답사(...", color: "bg-rose-500", category: "welfare" },
  { day: 20, title: "일자리교육 재택근무", color: "bg-rose-500", category: "welfare" },
  { day: 20, title: "복지3팀 회의", color: "bg-emerald-500", category: "team" },
  { day: 20, title: "치매예방 프로그램", color: "bg-rose-500", category: "welfare" },
  { day: 20, title: "건강검진 안내", color: "bg-rose-500", category: "welfare" },
  { day: 20, title: "어르신 생신잔치", color: "bg-rose-500", category: "welfare" },
  { day: 20, title: "복지관 시설 점검", color: "bg-rose-500", category: "welfare" },
  { day: 20, title: "사회복지사 워크숍", color: "bg-rose-500", category: "welfare" },
  { day: 20, title: "지역사회 연계 회의", color: "bg-rose-500", category: "welfare" },
  // 5월 21일
  { day: 21, title: "다비치안경분사세...", color: "bg-rose-500", category: "welfare" },
  { day: 21, title: "직원 워크숍", color: "bg-rose-500", category: "welfare" },
  { day: 21, title: "복지3팀 회의", color: "bg-emerald-500", category: "team" },
  // 5월 22일
  { day: 22, title: "노인일자리 및 자원...", color: "bg-rose-500", category: "welfare" },
  { day: 22, title: "사랑나눔법인 기관...", color: "bg-rose-500", category: "welfare" },
  { day: 22, title: "복지관 프로그램 평가", color: "bg-rose-500", category: "welfare" },
  // 5월 25일
  { day: 25, title: "전체 주간업무회의", color: "bg-rose-500", category: "welfare" },
  // 5월 26일
  { day: 26, title: "화요모임", color: "bg-rose-500", category: "welfare" },
  { day: 26, title: "직장선우회 예배", color: "bg-rose-500", category: "welfare" },
  { day: 26, title: "복지3팀 회의", color: "bg-emerald-500", category: "team" },
  { day: 26, title: "노인복지관 현장점검", color: "bg-rose-500", category: "welfare" },
  // 5월 27일
  { day: 27, title: "[한국교도회] 정기...", color: "bg-rose-500", category: "welfare" },
  { day: 27, title: "죽산농협 축구", color: "bg-rose-500", category: "welfare" },
  { day: 27, title: "복지관 월간 보고", color: "bg-rose-500", category: "welfare" },
  // 5월 28일
  { day: 28, title: "사전투표 모의시험", color: "bg-rose-500", category: "welfare" },
  { day: 28, title: "복지3팀 회의", color: "bg-emerald-500", category: "team" },
  { day: 28, title: "프로그램 운영 회의", color: "bg-rose-500", category: "welfare" },
  // 5월 29일
  { day: 29, title: "사전투표협조", color: "bg-rose-500", category: "welfare" },
  { day: 29, title: "[지구지킴이] 가시...", color: "bg-rose-500", category: "welfare" },
  // 5월 31일
  { day: 31, title: "사랑나눔(법인) 기...", color: "bg-rose-500", category: "welfare" },
]

export const volunteerEvents: VolunteerEvent[] = [
  // 오늘(5/24) 예정
  {
    id: "v-today-1",
    name: "박서연",
    program: "치매예방 프로그램 보조",
    day: 24,
    status: "scheduled",
  },
  {
    id: "v-today-2",
    name: "정하늘",
    program: "스마트폰 교육 봉사",
    day: 24,
    status: "scheduled",
  },
  {
    id: "v-today-3",
    name: "최민재",
    program: "식사 배식 봉사",
    day: 24,
    status: "scheduled",
  },
  // 최근 완료 (5/27)
  {
    id: "v1",
    name: "휴먼잡스",
    program: "스마트폰중급",
    day: 27,
    status: "completed",
  },
  {
    id: "v2",
    name: "빠담빠담",
    program: "스마트폰기초1",
    day: 27,
    status: "completed",
  },
  {
    id: "v3",
    name: "빠담빠담",
    program: "키오스크",
    day: 27,
    status: "completed",
  },
  {
    id: "v4",
    name: "휴먼잡스",
    program: "스마트폰기초2",
    day: 27,
    status: "completed",
  },
  {
    id: "v5",
    name: "김영희",
    program: "원예치료 프로그램",
    day: 26,
    status: "completed",
  },
  {
    id: "v6",
    name: "이준호",
    program: "레크리에이션 보조",
    day: 25,
    status: "completed",
  },
]