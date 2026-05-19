import type { ElementType } from "react"

export type CalendarTab = "all" | "welfare" | "team"

export interface StatCardDataDTO {
  label: string
  labelEn: string
  value: string
  unit: string
  description: string
  iconName: string
  color: string
  link?: string
  showChart?: boolean
  goto?: string
}

export interface StatCardData extends Omit<StatCardDataDTO, "iconName"> {
  icon: ElementType
}

export interface ProgressCardDataDTO {
  label: string
  value: number
  iconName: string
  color: string
  textColor: string
}

export interface ProgressCardData extends Omit<ProgressCardDataDTO, "iconName"> {
  icon: ElementType
}

export interface DashboardOverview {
  stats: StatCardData[]
  progress: ProgressCardData[]
  calendarEvents: CalendarEvent[]
  volunteerEvents: VolunteerEvent[]
}

export interface DashboardOverviewDTO {
  stats: StatCardDataDTO[]
  progress: ProgressCardDataDTO[]
  calendarEvents: CalendarEvent[]
  volunteerEvents: VolunteerEvent[]
}

export interface CalendarEvent {
  day: number
  title: string
  color: string
}

export interface VolunteerEvent {
  id: string
  title: string
  date: string
  type: string
}