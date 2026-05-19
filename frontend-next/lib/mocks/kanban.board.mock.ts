// Mock Data for 봄이봇 사업관리 시스템

import {
  Category,
  ColumnType,
  KanbanProject,
  ProjectImageOption,
  Staff,
  Task,
} from "@/services/kanban.board.types"

/** 신규 사업 등록 시 기본 칸반 컬럼 (순서·제목 고정) */
export const DEFAULT_KANBAN_COLUMNS: ReadonlyArray<{
  title: ColumnType
  color: string
}> = [
  { title: "실적관리", color: "bg-success" },
  { title: "사업계획", color: "bg-primary" },
  { title: "만족도조사", color: "bg-accent" },
  { title: "사업평가", color: "bg-priority-high" },
] as const

export function createDefaultProjectCategories(options?: {
  initialTask?: Omit<Task, "id">
}): Category[] {
  return DEFAULT_KANBAN_COLUMNS.map((column) => ({
    id: crypto.randomUUID(),
    title: column.title,
    color: column.color,
    tasks:
      column.title === "실적관리" && options?.initialTask
        ? [{ id: crypto.randomUUID(), ...options.initialTask }]
        : [],
  }))
}

export function findCategoryIdByTitle(
  categories: Category[],
  title: ColumnType
): string | undefined {
  return categories.find((category) => category.title === title)?.id
}

export function findTaskLocation(taskId: string): {
  projectId: string
  categoryId: string
  categoryTitle: ColumnType
  task: Task
} | null {
  for (const project of projectsMock) {
    for (const category of project.categories) {
      const task = category.tasks.find((item) => item.id === taskId)
      if (task) {
        return {
          projectId: project.id,
          categoryId: category.id,
          categoryTitle: category.title as ColumnType,
          task,
        }
      }
    }
  }

  return null
}

const COLUMN_PIPELINE: ColumnType[] = [
  "실적관리",
  "사업계획",
  "만족도조사",
  "사업평가",
]

/** 완료 시 다음 칸반 컬럼으로 이동. 사업평가는 보드에서 완료 표시만 합니다. */
export function advanceTaskToNextProcess(taskId: string): boolean {
  const location = findTaskLocation(taskId)
  if (!location) return false

  const { projectId, categoryId, categoryTitle, task } = location
  const project = projectsMock.find((item) => item.id === projectId)
  if (!project) return false

  const columnIndex = COLUMN_PIPELINE.indexOf(categoryTitle)
  if (columnIndex === -1) return false

  if (categoryTitle === "사업평가") {
    const total = task.totalCount ?? 10
    const taskIndex = project.categories
      .find((category) => category.id === categoryId)
      ?.tasks.findIndex((item) => item.id === taskId)

    if (taskIndex === undefined || taskIndex < 0) return false

    const category = project.categories.find((item) => item.id === categoryId)
    if (!category) return false

    category.tasks[taskIndex] = {
      ...category.tasks[taskIndex],
      completedCount: total,
    }

    return true
  }

  const nextColumnTitle = COLUMN_PIPELINE[columnIndex + 1]
  const sourceCategory = project.categories.find(
    (category) => category.id === categoryId
  )
  const targetCategory = project.categories.find(
    (category) => category.title === nextColumnTitle
  )

  if (!sourceCategory || !targetCategory) return false

  const taskIndex = sourceCategory.tasks.findIndex((item) => item.id === taskId)
  if (taskIndex === -1) return false

  const [movedTask] = sourceCategory.tasks.splice(taskIndex, 1)
  targetCategory.tasks.push({
    ...movedTask,
    completedCount: 0,
    totalCount: movedTask.totalCount ?? 10,
  })

  return true
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
    id: "proj1", // 보드 id
    number: "1", // 보드 순서 position 번호
    title: "상담", // 보드 이름
    team: "복지1팀", // 담당자 팀 
    manager: "김영수 사회복지사", // 담당자 
    image: "/Counseling-removebg-preview.png", // 보드 image url 프론트엔드에서 선택
    year: "2026",
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
            assignee: "김영수",
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
            assignee: "김영수",
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
            assignee: "김영수",
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
            assignee: "김영수",
            completedCount: 3,
            totalCount: 10,
          },
        ],
      },
    ],
  },
  {
    id: "proj2",
    number: "2",
    title: "교육",
    team: "노인 정보화 교육",
    manager: "박미영",
    image: "/Education-removebg-preview.png",    
    year: "2026",
    categories: [
      {
        id: "cat5",
        title: "실적관리",
        color: "bg-success",
        tasks: [
          {
            id: "task5",
            title: "스마트폰 교육 실적",
            description: "4월 스마트폰 활용 교육 실적 등록",
            assignee: "박미영",
            completedCount: 28,
            totalCount: 30,
          },
        ],
      },
      {
        id: "cat6",
        title: "사업계획",
        color: "bg-primary",
        tasks: [
          {
            id: "task6",
            title: "하반기 교육 계획",
            description: "하반기 정보화 교육 커리큘럼 수립",
            assignee: "박미영",
            completedCount: 5,
            totalCount: 15,
          },
        ],
      },
      {
        id: "cat7",
        title: "만족도조사",
        color: "bg-accent",
        tasks: [],
      },
      {
        id: "cat8",
        title: "사업평가",
        color: "bg-priority-high",
        tasks: [],
      },
    ],
  },
  {
    id: "proj3",
    number: "1",
    title: "교육",
    team: "노인 정보화 교육",
    manager: "박미영",
    image: "/Education-removebg-preview.png",    
    year: "2025",
    categories: [
      {
        id: "cat9",
        title: "실적관리",
        color: "bg-success",
        tasks: [
          {
            id: "task7",
            title: "스마트폰 교육 실적",
            description: "4월 스마트폰 활용 교육 실적 등록",
            assignee: "박미영",
            completedCount: 28,
            totalCount: 30,
          },
        ],
      },
      {
        id: "cat10",
        title: "사업계획",
        color: "bg-primary",
        tasks: [
          {
            id: "task8",
            title: "하반기 교육 계획",
            description: "하반기 정보화 교육 커리큘럼 수립",
            assignee: "박미영",
            completedCount: 5,
            totalCount: 15,
          },
        ],
      },
      {
        id: "cat11",
        title: "만족도조사",
        color: "bg-accent",
        tasks: [],
      },
      {
        id: "cat12",
        title: "사업평가",
        color: "bg-priority-high",
        tasks: [],
      },
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
  { label: "상담", value: "/Counseling-removebg-preview.png" },
  { label: "교육", value: "/Education-removebg-preview.png" },
  { label: "건강", value: "/Health-removebg-preview.png" },
  { label: "돌봄", value: "/Care-removebg-preview.png" },
  { label: "지역사회", value: "/Community-removebg-preview.png" },
]


// 칸반 performance
export const subProjects = [
  { id: "sub1", projectId: "proj1", name: "신규회원 이용상담", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 127, actualCount: 127, month: "1월" },
  { id: "sub2", projectId: "proj1", name: "신규회원 가입", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 127, actualCount: 127, month: "1월" },
  { id: "sub3", projectId: "proj1", name: "신규회원 교육", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 116, actualCount: 116, month: "1월" },
  { id: "sub4", projectId: "proj1", name: "정보제공상담", category: "--", planPeople: 0, planCount: 0, planBudget: 0, actualPeople: 0, actualCount: 0, month: "1월" },
  { id: "sub5", projectId: "proj1", name: "신규회원 이용상담", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 93, actualCount: 93, month: "2월" },
  { id: "sub6", projectId: "proj1", name: "신규회원 가입", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 93, actualCount: 93, month: "2월" },
  { id: "sub7", projectId: "proj1", name: "신규회원 교육", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 124, actualCount: 124, month: "2월" },
  { id: "sub8", projectId: "proj1", name: "신규회원 이용상담", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 73, actualCount: 73, month: "3월" },
  { id: "sub9", projectId: "proj1", name: "신규회원 가입", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 73, actualCount: 73, month: "3월" },
  { id: "sub10", projectId: "proj1", name: "신규회원 교육", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 62, actualCount: 62, month: "3월" },
]

export const performanceReports = [
  {
    id: "report1",
    category: "상담",
    projectName: "일반상담 및 정보제공사업",
    subProjects: [
      {
        name: "신규회원 이용상담",
        detail: "",
        jan: { planPeople: 80, actualPeople: 127, planCount: 80, actualCount: 127, planBudget: 0, actualBudget: 0 },
        feb: { planPeople: 80, actualPeople: 93, planCount: 80, actualCount: 93, planBudget: 0, actualBudget: 0 },
        mar: { planPeople: 80, actualPeople: 73, planCount: 80, actualCount: 73, planBudget: 0, actualBudget: 0 },
      },
      {
        name: "신규회원 가입",
        detail: "",
        jan: { planPeople: 80, actualPeople: 127, planCount: 80, actualCount: 127, planBudget: 0, actualBudget: 0 },
        feb: { planPeople: 80, actualPeople: 93, planCount: 80, actualCount: 93, planBudget: 0, actualBudget: 0 },
        mar: { planPeople: 80, actualPeople: 73, planCount: 80, actualCount: 73, planBudget: 0, actualBudget: 0 },
      },
    ],
    subtotal: {
      planPeople: 240,
      actualPeople: 370,
      planCount: 240,
      actualCount: 370,
      planBudget: 0,
      actualBudget: 0,
    },
  },
]

export const budgetReports = [
  {
    id: "budget1",
    category: "사업비",
    subCategory: "사업비",
    projectName: "일반상담 및 정보제공사업",
    budget2026: 15000000,
    budget2025: 0,
    income: 15000000,
    subsidy: 0,
    donation: 0,
    transfer: 0,
    misc: 0,
    total: 15000000,
    ratio: "100%",
  },
  {
    id: "budget5",
    category: "사업비",
    subCategory: "사업비",
    projectName: "전문상담사업",
    budget2026: 3738000,
    budget2025: 0,
    income: 2880000,
    subsidy: 858000,
    donation: 0,
    transfer: 0,
    misc: 0,
    total: 3738000,
    ratio: "100%",
  },
]

export const businessPlanReports = {
  summary: {
    totalProjects: 30,
    totalPeople: 808039,
    totalCount: 199908,
    totalBudget: 6867246003,
  },
  items: [
    {
      id: "plan1",
      mainCategory: "1",
      subCategory: "일반상담 및 정보제공사업",
      details: [
        {
          name: "신규회원 이용상담",
          people: 960,
          count: 960,
          budget: 0,
          purpose: "초기상담을 통한 욕구별 서비스 안내",
          target: "복지관 신규등록 회원",
          period: "2026년 1월 1일 ~ 2026년 12월 31일",
          method: "초기상담 및 복지관 이용 관련 상담",
          evaluation: "내부기안(실적보고서), 이용자 명부, 상담일지",
        },
      ],
      subtotal: {
        people: 2960,
        count: 2965,
        budget: 15000000,
        content: "사업수입 15,000,000",
      },
    },
  ],
}


