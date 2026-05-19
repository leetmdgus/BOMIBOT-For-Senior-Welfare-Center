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
}

export interface SurveyResultsSummary {
  totalResponses: number
  totalTarget: number
  averageSatisfaction: number
  completionRate: number
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
