import type { OntologyClass, OntologyPredicate } from "./types"

/** 봄이봇 도메인 온톨로지 어휘 (TBox) */
export const ONTOLOGY_CLASSES: Record<
  OntologyClass,
  { label: string; description: string; parent: OntologyClass | null }
> = {
  Platform: {
    label: "봄이봇 플랫폼",
    description: "사회복지 사업관리 통합 플랫폼",
    parent: null,
  },
  Domain: {
    label: "업무 도메인",
    description: "실적·칸반·조직 등 상위 영역",
    parent: "Platform",
  },
  SubProject: {
    label: "세부사업(세목)",
    description: "계획/실적 입력의 세부사업명",
    parent: "Domain",
  },
  DetailCategory: {
    label: "세세목(상세분류)",
    description: "세부사업 하위 상세분류",
    parent: "SubProject",
  },
  TimePeriod: {
    label: "시간(월)",
    description: "월별 실적 구간",
    parent: null,
  },
  PerformanceRecord: {
    label: "계획/실적 행",
    description: "입력관리 단위 레코드",
    parent: "Domain",
  },
  MetricBundle: {
    label: "지표 묶음",
    description: "인원·횟수·예산·지출 집계",
    parent: null,
  },
  KanbanProject: {
    label: "칸반 프로젝트",
    description: "보드 단위 사업",
    parent: "Domain",
  },
  KanbanColumn: {
    label: "칸반 단계",
    description: "실적관리·사업계획 등 컬럼",
    parent: "KanbanProject",
  },
  Task: {
    label: "업무 카드",
    description: "칸반 태스크",
    parent: "KanbanColumn",
  },
  Department: {
    label: "부서",
    description: "조직 부서",
    parent: "Domain",
  },
  Employee: {
    label: "직원",
    description: "조직 구성원",
    parent: "Department",
  },
  Ebook: {
    label: "전자책",
    description: "자료실 도서",
    parent: "Domain",
  },
  Survey: {
    label: "설문",
    description: "만족도·평가 설문",
    parent: "Domain",
  },
  DashboardIndicator: {
    label: "대시보드 지표",
    description: "대시보드 KPI",
    parent: "Domain",
  },
  ProgressIndicator: {
    label: "달성률 지표",
    description: "인원·횟수·예산 달성률",
    parent: "Domain",
  },
}

export const PREDICATE_LABELS: Record<OntologyPredicate, string> = {
  "rdf:type": "유형",
  partOf: "상위 포함",
  hasSubProject: "세목 보유",
  hasDetailCategory: "세세목",
  occursIn: "발생 시점",
  hasMetric: "지표",
  aggregatesTo: "집계",
  belongsToProject: "프로젝트 소속",
  inColumn: "단계",
  assignedTo: "담당",
  memberOf: "소속",
  measures: "측정",
  relatedTo: "연관",
  hasTask: "업무",
  hasColumn: "단계",
  hasIndicator: "지표",
  hasProgress: "달성률",
  hasEbook: "자료",
  hasSurvey: "설문",
}

export const DOMAIN_NODE_IDS = {
  performance: "domain:performance",
  dashboard: "domain:dashboard",
  kanban: "domain:kanban",
  organization: "domain:organization",
  ebooks: "domain:ebooks",
  survey: "domain:survey",
} as const
