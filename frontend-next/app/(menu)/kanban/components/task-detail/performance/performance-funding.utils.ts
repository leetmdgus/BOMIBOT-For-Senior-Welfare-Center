import type {
  PerformanceFundingEntry,
  PerformanceFundingSource,
  PerformanceRow,
} from "@/services/kanban.performance.types"

export function sumFundingAmounts(
  entries?: PerformanceFundingEntry[],
): number {
  return entries?.reduce((sum, entry) => sum + entry.amount, 0) ?? 0
}

export function collectFundingSources(
  row: PerformanceRow,
): PerformanceFundingSource[] {
  const sources = new Set<PerformanceFundingSource>()

  row.planFunding?.forEach((entry) => sources.add(entry.source))
  row.actualFunding?.forEach((entry) => sources.add(entry.source))
  row.fundingSources?.forEach((source) => sources.add(source))

  return sources.size > 0 ? [...sources] : []
}

export function getPlanFundingEntries(
  row: PerformanceRow,
): PerformanceFundingEntry[] {
  if (row.planFunding?.length) return row.planFunding

  if (row.planBudget > 0) {
    const source = row.fundingSources?.[0] ?? "비"
    return [{ source, amount: row.planBudget }]
  }

  return []
}

export function getActualFundingEntries(
  row: PerformanceRow,
): PerformanceFundingEntry[] {
  if (row.actualFunding?.length) return row.actualFunding

  if (row.actualExpense > 0) {
    const source = row.fundingSources?.[0] ?? "비"
    return [{ source, amount: row.actualExpense }]
  }

  return []
}

export function applyPlanFunding(
  row: PerformanceRow,
  entries: PerformanceFundingEntry[],
): PerformanceRow {
  const planBudget = sumFundingAmounts(entries)

  return {
    ...row,
    planFunding: entries,
    planBudget,
    fundingSources: collectFundingSources({
      ...row,
      planFunding: entries,
      planBudget,
    }),
  }
}

export function applyActualFunding(
  row: PerformanceRow,
  entries: PerformanceFundingEntry[],
): PerformanceRow {
  const actualExpense = sumFundingAmounts(entries)

  return {
    ...row,
    actualFunding: entries,
    actualExpense,
    fundingSources: collectFundingSources({
      ...row,
      actualFunding: entries,
      actualExpense,
    }),
  }
}
