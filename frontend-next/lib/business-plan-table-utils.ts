export type BusinessPlanTablePreset = "purpose-goals" | "custom"

export type BusinessPlanPurposeGoalsTableData = {
  preset: "purpose-goals"
}

export type BusinessPlanCustomTableData = {
  preset: "custom"
  rows: string[][]
  headerRowCount: number
}

export type BusinessPlanTableSectionData =
  | BusinessPlanPurposeGoalsTableData
  | BusinessPlanCustomTableData

export function createDefaultCustomTable(
  rowCount = 3,
  colCount = 3,
  headerRowCount = 1,
): BusinessPlanCustomTableData {
  const rows = Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: colCount }, () =>
      rowIndex < headerRowCount ? `헤더 ${rowIndex + 1}` : "",
    ),
  )
  return {
    preset: "custom",
    rows,
    headerRowCount: Math.min(headerRowCount, rowCount),
  }
}

export function parseTableSectionContent(
  content: string | undefined,
): BusinessPlanTableSectionData {
  if (!content?.trim()) {
    return { preset: "purpose-goals" }
  }
  try {
    const parsed = JSON.parse(content) as BusinessPlanTableSectionData
    if (parsed.preset === "custom" && Array.isArray(parsed.rows)) {
      const rows = parsed.rows.map((row) =>
        Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [],
      )
      const colCount = Math.max(...rows.map((r) => r.length), 1)
      const normalized = rows.map((row) =>
        Array.from({ length: colCount }, (_, i) => row[i] ?? ""),
      )
      return {
        preset: "custom",
        rows: normalized.length > 0 ? normalized : [["", ""]],
        headerRowCount: Math.min(
          Math.max(0, parsed.headerRowCount ?? 1),
          normalized.length,
        ),
      }
    }
    if (parsed.preset === "purpose-goals") {
      return { preset: "purpose-goals" }
    }
  } catch {
    /* legacy: plain text → custom single cell */
  }
  return {
    preset: "custom",
    rows: [[content.trim() || ""]],
    headerRowCount: 0,
  }
}

export function serializeTableSectionContent(
  data: BusinessPlanTableSectionData,
): string {
  return JSON.stringify(data)
}

export function addCustomTableRow(
  data: BusinessPlanCustomTableData,
  index?: number,
): BusinessPlanCustomTableData {
  const colCount = data.rows[0]?.length ?? 2
  const newRow = Array.from({ length: colCount }, () => "")
  const rows = [...data.rows]
  const at = index ?? rows.length
  rows.splice(at, 0, newRow)
  return { ...data, rows }
}

export function removeCustomTableRow(
  data: BusinessPlanCustomTableData,
  index: number,
): BusinessPlanCustomTableData | null {
  if (data.rows.length <= 1) return null
  const rows = data.rows.filter((_, i) => i !== index)
  const headerRowCount = Math.min(data.headerRowCount, rows.length)
  return { ...data, rows, headerRowCount }
}

export function addCustomTableColumn(
  data: BusinessPlanCustomTableData,
  index?: number,
): BusinessPlanCustomTableData {
  const at = index ?? (data.rows[0]?.length ?? 0)
  const rows = data.rows.map((row) => {
    const next = [...row]
    next.splice(at, 0, "")
    return next
  })
  return { ...data, rows: rows.length > 0 ? rows : [[""]] }
}

export function removeCustomTableColumn(
  data: BusinessPlanCustomTableData,
  index: number,
): BusinessPlanCustomTableData | null {
  const colCount = data.rows[0]?.length ?? 0
  if (colCount <= 1) return null
  const rows = data.rows.map((row) => row.filter((_, i) => i !== index))
  return { ...data, rows }
}

export function updateCustomTableCell(
  data: BusinessPlanCustomTableData,
  rowIndex: number,
  colIndex: number,
  value: string,
): BusinessPlanCustomTableData {
  const rows = data.rows.map((row, ri) =>
    ri === rowIndex
      ? row.map((cell, ci) => (ci === colIndex ? value : cell))
      : [...row],
  )
  return { ...data, rows }
}

export function setCustomTableHeaderRowCount(
  data: BusinessPlanCustomTableData,
  headerRowCount: number,
): BusinessPlanCustomTableData {
  return {
    ...data,
    headerRowCount: Math.min(
      Math.max(0, headerRowCount),
      data.rows.length,
    ),
  }
}
