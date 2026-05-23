import type {
  BusinessEvaluationData,
  EvaluationFile,
  Survey,
} from "@/services/kanban.task-detail.types"

export const surveysData: Survey[] = [
  {
    id: "1",
    title: "경로식당 이용 만족도 조사",
    program: "춘천북부노인복지관 경로식당 운영사업",
    date: "2025. 7. 27. 오후 2:00",
    status: "진행중",
    endDate: "2025-08-10",
  },
  {
    id: "2",
    title: "스마트폰 활용 교육 만족도 조사",
    program: "디지털 역량강화 프로그램",
    status: "완료",
    endDate: "2025-06-30",
  },
  {
    id: "3",
    title: "노년사회화교육 상반기 만족도 조사",
    program: "노년사회화교육 지원사업",
    status: "예정",
    endDate: "2025-09-15",
  },
  {
    id: "4",
    title: "건강체조 프로그램 참여자 평가",
    program: "어르신 건강증진 프로그램",
    status: "진행중",
    endDate: "2025-08-31",
  },
  {
    id: "5",
    title: "독거노인 정서지원 서비스 만족도 조사",
    program: "지역사회 통합돌봄 사업",
    status: "임시",
    endDate: "2025-10-01",
  },
]

export const filesData: EvaluationFile[] = [
  {
    id: "eval-1",
    name: "2025 세대통합 사업 평가서",
    type: "평가서",
  },
  {
    id: "eval-2",
    name: "2025 세대통합 실적 내역서",
    type: "내역서",
  },
  {
    id: "eval-3",
    name: "2025 세대통합 운영 지침서",
    type: "지침서",
  },
  {
    id: "eval-4",
    name: "2025 세대통합 결과표",
    type: "결과표",
  },
  {
    id: "eval-5",
    name: "2025 세대통합 사업계획서",
    type: "계획서",
  },
]

export const viewTogetherFixedFiles: EvaluationFile[] = [
  { id: "fixed-template", name: "기본틀", type: "틀" },
  { id: "fixed-plan", name: "사업계획서", type: "계획서" },
]

export const businessEvaluationData: BusinessEvaluationData = {
  team: "복지1팀",
  manager: "복지1팀 김연수 사회복지사",
  period: "2026-01-01 ~ 2026-12-31",
  programName: "",
  target:
    "춘천시 거주 만 60세 이상 어르신 중 복지관 이용 희망자 및 이용자",
  planCount: "2,960명 / 2,965회",
  planBudget: "금 15,000,000원 (천오백만)",
  actualCount: "896명 / 896회",
  actualExpense: "-",
  purpose:
    "개별 욕구에 적합한 상담으로 정보 및 복지서비스를 제공하여 건강하고 안정적인 노후 생활 지원",
  goals: [
    "초기상담을 통한 욕구 파악으로 이용자 편리성 증진",
    "기관 사업 및 이용 규정에 대한 이해도 향상",
    "전문지식 제공으로 노년기 문제 해결 능력 강화",
  ],
  performanceIndicator: "",
  evaluationTool: "",
  keyFactorAnalysis: "",
  goalAppropriacy: "",
  suggestion: "",
  supervision: "",
  evaluationDate: "2026-01-15",
  isCompleted: false,
  detailRows: [
    {
      label: "사업공간 확보",
      content: "상담실·프로그램실 등 사업 수행 공간 확보 및 운영",
    },
    {
      label: "사업 홍보",
      content: "기관 홈페이지, 안내문, 지역 네트워크를 통한 홍보",
    },
    {
      label: "운영 일정",
      content: "연간 운영 일정에 따른 상담·교육 프로그램 진행",
    },
    {
      label: "평가 방법",
      content: "만족도 조사, 실적 대비 목표 달성도, 슈퍼비전",
    },
  ],
  sections: [
    {
      id: "sec-1",
      type: "heading",
      title: "I. 사업의 배경 및 필요성",
      content: "",
    },
    {
      id: "sec-2",
      type: "body",
      title: "",
      content:
        "1. 대상자 욕구 및 문제점\n통계청의 고령자 통계에 따르면 고령화 대응의 필요성이 더욱 증가할 것으로 예상됩니다.\n\n2. 지역사회 환경적 특성\n지역 내 복지 자원 연계를 통한 서비스 접근성 강화가 필요합니다.",
    },
  ],
}

