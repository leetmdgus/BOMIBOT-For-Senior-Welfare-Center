"use client"

import { useEffect, useState } from "react"

import { getCurrentYearString } from "@/lib/current-year"
import {
  businessNameForTask,
  resolveKanbanCardTitle,
} from "@/lib/kanban/resolve-card-title"
import { getProjects } from "@/services/kanban.board.service"

/** 칸반 카드 ID → 업무명(사업명) */
export function useKanbanCardTitle(taskId: string): string {
  const [cardTitle, setCardTitle] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) {
      setCardTitle(null)
      return
    }

    let cancelled = false
    const year = getCurrentYearString()

    getProjects(year)
      .then((projects) => {
        if (!cancelled) {
          setCardTitle(resolveKanbanCardTitle(taskId, projects))
        }
      })
      .catch(() => {
        if (!cancelled) setCardTitle(null)
      })

    return () => {
      cancelled = true
    }
  }, [taskId])

  return businessNameForTask(taskId, cardTitle)
}
