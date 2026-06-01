import type { BusinessPlanSubProject } from "@/services/kanban.task-detail.types"
import type {
  EvaluationDetailRow,
} from "@/services/kanban.task-detail.types"
import type {
  PerformanceRow,
  PerformanceSubProjectChip,
} from "@/services/kanban.performance.types"

const SKIP_SUB_PROJECT_NAMES = new Set(["", "선택", "--", "—"])

export function collectPerformanceSubProjectNames(
  chips: PerformanceSubProjectChip[],
  rows: PerformanceRow[],
): string[] {
  const names: string[] = []
  const seen = new Set<string>()

  for (const chip of chips) {
    const label = chip.label.trim()
    if (SKIP_SUB_PROJECT_NAMES.has(label) || seen.has(label)) continue
    names.push(label)
    seen.add(label)
  }

  for (const row of rows) {
    const sub = row.subProject.trim()
    if (SKIP_SUB_PROJECT_NAMES.has(sub) || seen.has(sub)) continue
    names.push(sub)
    seen.add(sub)
  }

  return names
}

export function mergePlanSubProjectsFromPerformance(
  existing: BusinessPlanSubProject[],
  performanceNames: string[],
): BusinessPlanSubProject[] {
  if (performanceNames.length === 0) {
    return existing.map((item) => ({ ...item }))
  }

  const byName = new Map<string, BusinessPlanSubProject>()
  for (const item of existing) {
    const name = item.name.trim()
    if (name) byName.set(name, { ...item })
  }

  return performanceNames.map((name) => {
    const matched = byName.get(name)
    if (matched) return matched
    return { name, output: "", outcome: "" }
  })
}

export function mergeEvaluationDetailRowsFromPerformance(
  existing: EvaluationDetailRow[],
  performanceNames: string[],
): EvaluationDetailRow[] {
  if (performanceNames.length === 0) {
    return existing.map((row) => ({ ...row }))
  }

  const byLabel = new Map<string, EvaluationDetailRow>()
  for (const row of existing) {
    const label = row.label.trim()
    if (label) byLabel.set(label, { ...row })
  }

  return performanceNames.map((label) => {
    const matched = byLabel.get(label)
    if (matched) return matched
    return { label, content: "" }
  })
}
