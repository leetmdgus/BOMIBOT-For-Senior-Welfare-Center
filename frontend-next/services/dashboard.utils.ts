import {
  Calendar as CalendarIcon,
  DollarSign,
  Layers,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"

import type {
  CalendarEvent,
  DashboardOverview,
  DashboardOverviewDTO,
  ProgressCardData,
  ProgressCardDataDTO,
  StatCardData,
  VolunteerEvent,
} from "./dashboard.types"

const statIconMap: Record<string, LucideIcon> = {
  Users,
  Layers,
  TrendingUp,
  Calendar: CalendarIcon,
  DollarSign,
}

const progressIconMap: Record<string, LucideIcon> = {
  Users,
  Calendar: CalendarIcon,
  DollarSign,
}

export function hydrateDashboardOverview(
  dto: DashboardOverviewDTO
): DashboardOverview {
  return {
    stats: dto.stats.map((stat) => ({
      ...stat,
      icon: statIconMap[stat.iconName] ?? Users,
    })),
    progress: dto.progress.map((item) => ({
      ...item,
      icon: progressIconMap[item.iconName] ?? Users,
    })),
    calendarEvents: dto.calendarEvents,
    volunteerEvents: dto.volunteerEvents,
  }
}

export function toDashboardOverviewDTO(
  overview: DashboardOverview
): DashboardOverviewDTO {
  return {
    stats: overview.stats.map((stat) => {
      const iconName =
        Object.entries(statIconMap).find(([, icon]) => icon === stat.icon)?.[0] ??
        "Users"

      return {
        label: stat.label,
        labelEn: stat.labelEn,
        value: stat.value,
        unit: stat.unit,
        description: stat.description,
        color: stat.color,
        link: stat.link,
        showChart: stat.showChart,
        goto: stat.goto,
        iconName,
      }
    }),
    progress: overview.progress.map((item) => {
      const iconName =
        Object.entries(progressIconMap).find(([, icon]) => icon === item.icon)?.[0] ??
        "Users"

      return {
        label: item.label,
        value: item.value,
        color: item.color,
        textColor: item.textColor,
        iconName,
      }
    }),
    calendarEvents: overview.calendarEvents,
    volunteerEvents: overview.volunteerEvents,
  }
}
