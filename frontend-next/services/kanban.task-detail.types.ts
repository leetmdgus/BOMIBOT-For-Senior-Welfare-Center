export type SurveyStatus = "진행중" | "완료" | "예정" | "임시"

export const statusStyles: Record<SurveyStatus, string> = {
  진행중: "bg-amber-100 text-amber-700",
  완료: "bg-blue-100 text-blue-700",
  예정: "bg-red-100 text-red-700",
  임시: "bg-gray-100 text-gray-600",
}

export interface Survey {
  id: string
  title: string
  program: string
  date?: string
  status: SurveyStatus
  endDate: string
}

export type TaskReferenceDocumentSource =
  | "builtin"
  | "file-manager"
  | "saved-plan"

export interface EvaluationFile {
  id: string
  name: string
  type: string
  /** builtin: 기본틀·저장된 계획서 / file-manager: 파일관리 업로드 */
  source?: TaskReferenceDocumentSource
  mimeType?: string
  fileType?: string
  hasContent?: boolean
  contentMissing?: boolean
}

export interface EvaluationDetailRow {
  label: string
  content: string
}

export type EvaluationSectionType = "heading" | "body" | "table" | "file"

export type DocumentMediaKind = "image" | "pdf" | "video"

export interface DocumentMediaAttachment {
  fileId: string
  name: string
  mimeType?: string
  mediaKind: DocumentMediaKind
}

export interface EvaluationSection {
  id: string
  type: EvaluationSectionType
  title: string
  content: string
}

export interface BusinessEvaluationData {
  team: string
  manager: string
  period: string
  programName: string
  target: string
  planCount: string
  planBudget: string
  actualCount: string
  actualExpense: string
  purpose: string
  goals: string[]
  performanceIndicator: string
  evaluationTool: string
  keyFactorAnalysis: string
  goalAppropriacy: string
  suggestion: string
  supervision: string
  evaluationDate: string
  isCompleted: boolean
  detailRows: EvaluationDetailRow[]
  sections: EvaluationSection[]
  /** 저장 시 템플릿 치환으로 생성된 HWPX (파일관리) */
  hwpxFileId?: string
}

export interface SaveBusinessEvaluationPayload {
  team?: string
  manager?: string
  period?: string
  programName?: string
  target?: string
  planCount?: string
  planBudget?: string
  actualCount?: string
  actualExpense?: string
  evaluationDate?: string
  purpose?: string
  goals?: string[]
  performanceIndicator?: string
  evaluationTool?: string
  supervision?: string
  detailRows?: EvaluationDetailRow[]
  sections?: EvaluationSection[]
  keyFactorAnalysis?: string
  goalAppropriacy?: string
  suggestion?: string
}

/** 이전 양식 불러오기용 기본 템플릿 (요약·본문 슬롯) */
export type BusinessEvaluationTemplate = Pick<
  BusinessEvaluationData,
  | "performanceIndicator"
  | "evaluationTool"
  | "keyFactorAnalysis"
  | "goalAppropriacy"
  | "suggestion"
  | "detailRows"
  | "sections"
>

export type BusinessPlanSectionType = "file" | "heading" | "body" | "table"

export interface BusinessPlanSection {
  id: number
  type: BusinessPlanSectionType
  title: string
  content?: string
}

export interface BusinessPlanSubProject {
  name: string
  output: string
  outcome: string
  purpose?: string
  content?: string
  target?: string
  period?: string
  operatingMethod?: string
  evaluationMethod?: string
}

export interface BusinessPlanFormData {
  projectName: string
  purpose: string
  goals: string[]
  period: string
  target: string
  totalCount: string
  budget: string
  budgetCategory: string
  manager: string
  subProjects: BusinessPlanSubProject[]
}

export interface BusinessPlanDocument {
  formData: BusinessPlanFormData
  sections: BusinessPlanSection[]
  isCompleted?: boolean
  /** 저장 시 템플릿 치환으로 생성된 HWPX (파일관리) */
  hwpxFileId?: string
}

export interface SaveBusinessPlanPayload {
  formData?: BusinessPlanFormData
  sections?: BusinessPlanSection[]
  isCompleted?: boolean
}
