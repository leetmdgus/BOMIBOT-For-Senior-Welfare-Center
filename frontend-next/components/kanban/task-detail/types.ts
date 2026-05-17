export type SurveyStatus = "진행중" | "완료" | "예정" | "임시"

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