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

export interface EvaluationFile {
  id: string
  name: string
  type: string
}

export interface EvaluationDetailRow {
  label: string
  content: string
}

export type EvaluationSectionType = "heading" | "body"

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
}

export interface SaveBusinessEvaluationPayload {
  evaluationDate?: string
  supervision?: string
  detailRows?: EvaluationDetailRow[]
  sections?: EvaluationSection[]
  keyFactorAnalysis?: string
  goalAppropriacy?: string
  suggestion?: string
}
