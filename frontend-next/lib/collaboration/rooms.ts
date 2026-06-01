import type { RegionId } from "@/lib/auth/regions"

export function kanbanRoom(regionId: RegionId, year: string) {
  return `region:${regionId}:kanban:${year}`
}

export function taskBusinessPlanRoom(regionId: RegionId, taskId: string) {
  return `region:${regionId}:task:${taskId}:business-plan`
}

export function taskEvaluationRoom(regionId: RegionId, taskId: string) {
  return `region:${regionId}:task:${taskId}:evaluation`
}
