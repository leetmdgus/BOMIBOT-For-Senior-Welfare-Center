export type SurveyQuestionType = "text" | "choice" | "matrix" | "scale"

export type SurveyStatus = "draft" | "active" | "closed"

export type SurveyListStatus = "진행중" | "완료" | "예정" | "임시"

export interface SurveyQuestion {
  id: string
  type: SurveyQuestionType
  title: string
  description: string
  required: boolean
  multiple?: boolean
  options: string[]
  rows: string[]
  columns: string[]
}

export interface SurveyOverview {
  purpose: string[]
  limitations: string[]
  name: string
  startDate: string
  endDate: string
  target: string
  method: string
  composition?: string
  staff: string
  sampleCount: string
  analysisMethod: string
}

export interface SurveyBasicInfo {
  title: string
  description: string
  category?: string
  status: SurveyStatus
}

export interface SurveyStyle {
  themeColor: string
  coverTitle: string
  coverDescription: string
  coverPeriodLabel: string
  thankYouMessage: string
}

export interface SurveySettings {
  acceptResponses: boolean
  allowDuplicate: boolean
  showProgress: boolean
}

export interface SurveyDetail {
  id: string
  taskId?: string
  overview: SurveyOverview
  basicInfo: SurveyBasicInfo
  questions: SurveyQuestion[]
  style: SurveyStyle
  settings: SurveySettings
}

export interface SurveyListItem {
  id: string
  title: string
  program: string
  date?: string
  status: SurveyListStatus
  endDate: string
  responseCount?: number
  totalTarget?: number
  satisfaction?: number
}

export interface SaveSurveyPayload {
  saveType: "draft" | "publish"
  overview: SurveyOverview
  basicInfo: SurveyBasicInfo
  questions: SurveyQuestion[]
  style?: Partial<SurveyStyle>
  settings?: Partial<SurveySettings>
  /** 칸반 업무(카드) 연결 */
  taskId?: string
}

export interface SaveSurveyResult {
  id: string
  savedAt: string
  status: SurveyStatus
}

export interface SurveyMatrixChartRow {
  name: string
  매우불만족: number
  불만족: number
  보통: number
  만족: number
  매우만족: number
}

export interface SurveyPieChartItem {
  name: string
  value: number
  color: string
}

export interface SurveyTextResponse {
  id: string
  text: string
  votes: number
}

/** 척도형 문항 점수 분포 — `score`(1~최대)별 응답 수 */
export interface SurveyScalePoint {
  score: number
  count: number
}

export interface SurveyQuestionResult {
  questionId: string
  type: SurveyQuestionType
  title: string
  subtitle?: string
  answeredCount: number
  skippedCount: number
  matrixChart?: SurveyMatrixChartRow[]
  pieData?: SurveyPieChartItem[]
  textResponses?: SurveyTextResponse[]
  otherText?: string
  otherCount?: number
  /** 척도형 점수 분포 (1~최대 점수) */
  scaleData?: SurveyScalePoint[]
  /** 척도형/만족도 문항의 평균 점수 */
  average?: number
}

export interface SurveyResultsSummary {
  totalResponses: number
  totalTarget: number
  averageSatisfaction: number
  completionRate: number
  /** 긍정 응답률(top-box) — 만족+매우만족(또는 4점 이상) 비율(%) */
  positiveRate?: number
}

export interface SurveyResults {
  surveyId: string
  summary: SurveyResultsSummary
  questions: SurveyQuestionResult[]
}

export type SurveyAnswerValue =
  | { type: "text"; value: string }
  | { type: "choice"; value: string | string[]; other?: string }
  | { type: "scale"; value: number }
  | { type: "matrix"; value: Record<string, string> }

export interface SurveyResponseAnswer {
  questionId: string
  answer: SurveyAnswerValue
}

export interface SubmitSurveyResponsePayload {
  answers: SurveyResponseAnswer[]
}

export interface SubmitSurveyResponseResult {
  responseId: string
  submittedAt: string
  message: string
}

/** 새 설문 생성용 템플릿 본문 (id·taskId 제외한 설문 상세) */
export type SurveyTemplateContent = Omit<SurveyDetail, "id" | "taskId">

/**
 * 사회복지 사업평가 양식(HWPX 사업평가/사업계획서)을 참고한 설문 템플릿.
 * 목적·대상·성과지표(설문)·분석방법이 사업평가 평가도구 흐름과 연결된다.
 */
export interface SurveyTemplate {
  id: string
  /** 템플릿 이름 (예: 프로그램 만족도 조사) */
  name: string
  /** 한 줄 설명 */
  summary: string
  /** 분류 (예: 만족도조사 / 사후평가) */
  category: string
  /** 검색·필터용 태그 */
  tags: string[]
  /** 문항 수 (목록 표시용) */
  questionCount: number
  /** 에디터에 채워질 설문 본문 */
  content: SurveyTemplateContent
}
