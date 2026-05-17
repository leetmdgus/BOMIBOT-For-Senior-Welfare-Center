export const columnTypesMock = [
  "실적관리",
  "사업계획",
  "만족도조사",
  "사업평가",
] as const

export type ColumnType = (typeof columnTypesMock)[number]

export interface Task {
  id: string
  title: string
  description: string
  assignee: string
}

export interface Category {
  id: string
  title: ColumnType
  color: string
  tasks: Task[]
}

export interface KanbanProject {
  id: string
  number: string
  title: string
  team?: string
  manager?: string
  image?: string
  categories: Category[]
}

export interface Staff {
  id: string
  name: string
  team: string
  position: string
}

export interface ProjectImageOption {
  label: string
  value: string
}

export const taskPathMapMock: Record<ColumnType, string> = {
  실적관리: "performance",
  사업계획: "business-plan",
  만족도조사: "survey",
  사업평가: "evaluation",
}

export const categoryColumnTypeMapMock: Record<string, ColumnType> = {
  실적관리: "실적관리",
  사업계획: "사업계획",
  사업계획서: "사업계획",
  만족도조사: "만족도조사",
  사업평가: "사업평가",
}

export const defaultColumnTypeMock: ColumnType = "실적관리"

export const projectsMock: KanbanProject[] = [
  {
    id: "1",
    number: "1",
    title: "상담",
    team: "복지 2팀",
    manager: "김영수",
    image: "/Counseling-removebg-preview.png",
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
            progressCount: "05/12",
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
            progressCount: "06/10",
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
            progressCount: "05/15",
            completedCount: 4,
            totalCount: 10,
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
            progressCount: "06/30",
            completedCount: 10,
            totalCount: 10,
          },
        ],
      },
    ],
  },
  {
    id: "2",
    number: "2",
    title: "교육",
    team: "복지 3팀",
    manager: "박미영",
    image: "/Education-removebg-preview.png",
    categories: [
      { id: "cat5", title: "실적관리", color: "bg-success", tasks: [] },
      { id: "cat6", title: "사업계획", color: "bg-primary", tasks: [] },
      { id: "cat7", title: "만족도조사", color: "bg-accent", tasks: [] },
      { id: "cat8", title: "사업평가", color: "bg-priority-high", tasks: [] },
    ],
  },
]

export const staffMock: Staff[] = [
  { id: "1", name: "김태민", team: "복지 1팀", position: "사회복지사" },
  { id: "2", name: "이창환", team: "복지 1팀", position: "사회복지사" },
  { id: "3", name: "이승현", team: "복지 1팀", position: "사회복지사" },
  { id: "4", name: "김영수", team: "복지 2팀", position: "사회복지사" },
  { id: "5", name: "박지연", team: "복지 2팀", position: "사회복지사" },
  { id: "6", name: "최민수", team: "운영지원팀", position: "사회복지사" },
]

export const projectImageOptions: ProjectImageOption[] = [
  {
    label: "상담",
    value: "/Counseling-removebg-preview.png",
  },
  {
    label: "교육",
    value: "/Education-removebg-preview.png",
  },
  {
    label: "건강",
    value: "/Health-removebg-preview.png",
  },
  {
    label: "돌봄",
    value: "/Care-removebg-preview.png",
  },
  {
    label: "지역사회",
    value: "/Community-removebg-preview.png",
  },
]