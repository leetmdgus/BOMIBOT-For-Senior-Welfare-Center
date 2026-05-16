import type { Project } from "@/types/kanban"

export const projectsMock: Project[] = [
  {
    id: "1",
    number: "1",
    title: "일반상담 및 정보제공사업",
    team: "복지1팀",
    manager: "김영수 사회복지사",
    categories: [
      {
        id: "cat1",
        title: "실적관리",
        color: "bg-success",
        tasks: [
          {
            id: "task1",
            title: "3월 상담 실적 등록",
            description: "상담 인원 및 횟수 데이터 입력",
            priority: "MEDIUM",
            assignee: "김영수",
            progressCount: "5/15",
            completedCount: 15,
            totalCount: 20,
          },
        ],
      },
      {
        id: "cat2",
        title: "사업계획",
        color: "bg-primary",
        tasks: [
          {
            id: "task2",
            title: "2026 사업계획서 수립",
            description: "연간 사업 목표 및 예산 수립",
            priority: "HIGH",
            assignee: "김영수",
            progressCount: "8/12",
            completedCount: 8,
            totalCount: 12,
          },
        ],
      },
      {
        id: "cat3",
        title: "만족도조사",
        color: "bg-accent",
        tasks: [
          {
            id: "task3",
            title: "이용자 만족도 설문 배포",
            description: "상반기 프로그램 만족도 조사",
            priority: "MEDIUM",
            assignee: "김영수",
            progressCount: "45/100",
            completedCount: 45,
            totalCount: 100,
          },
        ],
      },
      {
        id: "cat4",
        title: "사업평가",
        color: "bg-priority-high",
        tasks: [
          {
            id: "task4",
            title: "상반기 종합 평가서 작성",
            description: "성과 분석 및 개선 사항 도출",
            priority: "HIGH",
            assignee: "김영수",
            progressCount: "3/10",
            completedCount: 3,
            totalCount: 10,
          },
        ],
      },
    ],
  },
  {
    id: "2",
    number: "2",
    title: "전문상담사업",
    team: "복지2팀",
    manager: "박승현 사회복지사",
    categories: [
      { id: "cat5", title: "실적관리", color: "bg-success", tasks: [] },
      { id: "cat6", title: "사업계획", color: "bg-primary", tasks: [] },
      { id: "cat7", title: "만족도조사", color: "bg-accent", tasks: [] },
      { id: "cat8", title: "사업평가", color: "bg-priority-high", tasks: [] },
    ],
  },
]