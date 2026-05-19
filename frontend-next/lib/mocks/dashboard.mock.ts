export const schedules = [
  {
    id: "sch1",
    title: "근로자의 날",
    date: "2026-05-01",
    type: "holiday",
    color: "bg-red-500",
  },
  {
    id: "sch2",
    title: "어린이날",
    date: "2026-05-05",
    type: "holiday",
    color: "bg-pink-500",
  },
  {
    id: "sch3",
    title: "월간회의",
    date: "2026-05-10",
    type: "meeting",
    color: "bg-blue-500",
  },
]

export const volunteers = [
  {
    id: "vol1",
    name: "치매예방 캠페인",
    date: "2026-05-10",
    time: "14:00",
    location: "1층 로비",
  },
  {
    id: "vol2",
    name: "경로식당 배식봉사",
    date: "2026-05-12",
    time: "11:00",
    location: "지하1층 식당",
  },
]

export const dashboardStats = {
  personnelStatus: {
    count: 45,
    change: "+2명",
    description: "전년 대비 2명 증가 (신규 채용 포함)",
  },
  activeProjects: {
    count: 12,
    description: "2026년도 사업계획 승인 완료 기준",
  },
  serviceUsers: {
    count: 8420,
    description: "최근 3개월 누적 이용자 추이",
  },
  achievementRates: {
    personnel: 85,
    count: 92,
    budget: 74,
  },
}