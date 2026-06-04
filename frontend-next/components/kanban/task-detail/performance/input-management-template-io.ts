import type {
  PerformanceFundingEntry,
  PerformanceFundingSource,
  PerformanceRow,
} from "@/services/kanban.performance.types"

import { getPlanFundingEntries } from "./performance-funding.utils"

/**
 * 업로드/다운로드 템플릿(월별 계획·실적 양식) 정의.
 *
 * 재원(funding) 컬럼 ↔ 앱 재원 코드 매핑:
 *  - 앱 재원 코드: 경/기/비/지/법/사/잡
 *  - 템플릿 양식은 '법인전입금' 대신 '자부담' 컬럼을 사용하므로 법 ↔ 자부담 으로 매핑한다.
 *  (계획 예산은 재원별 컬럼 합계 = planBudget, 실적은 단일 '실적지출' 컬럼만 사용)
 */
export const TEMPLATE_FUNDING_COLUMNS: {
  header: string
  source: PerformanceFundingSource
}[] = [
  { header: "경상보조금", source: "경" },
  { header: "기타보조금", source: "기" },
  { header: "지정후원금", source: "지" },
  { header: "비지정후원금", source: "비" },
  { header: "자부담", source: "법" },
  { header: "사업수입", source: "사" },
  { header: "잡수입", source: "잡" },
]

export const TEMPLATE_HEADERS: string[] = [
  "세부사업명(세목)",
  "상세분류(세세목)",
  "월",
  "계획인원(명)",
  "계획횟수(회)",
  "단비",
  ...TEMPLATE_FUNDING_COLUMNS.map((column) => column.header),
  "내용",
  "메모",
  "실적인원(명)",
  "실적횟수(회)",
  "실적지출(원)",
]

type Json = Record<string, unknown>

/** 헤더 별칭들 중 처음 발견되는 값을 반환 (구 양식·신 양식 모두 허용) */
function pick(item: Json, ...aliases: string[]): unknown {
  for (const alias of aliases) {
    if (alias in item && item[alias] !== undefined && item[alias] !== null) {
      return item[alias]
    }
  }
  return undefined
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const cleaned = String(value ?? "").replaceAll(",", "").trim()
  if (!cleaned) return 0
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function toText(value: unknown): string {
  return String(value ?? "").trim()
}

/** "1", "1월", 1 → "1월" 로 정규화 */
function normalizeMonth(value: unknown): string {
  const raw = toText(value)
  if (!raw) return ""
  const match = raw.match(/(\d{1,2})/)
  return match ? `${Number(match[1])}월` : raw
}

/** "1월" → "1" (템플릿은 월을 정수로 기록) */
function monthToNumber(month: string): string {
  const match = month.match(/(\d{1,2})/)
  return match ? String(Number(match[1])) : month
}

function fundingMap(entries: PerformanceFundingEntry[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const entry of entries) {
    map.set(entry.source, (map.get(entry.source) ?? 0) + entry.amount)
  }
  return map
}

/** 행 → 템플릿 레코드(헤더 키 객체) */
export function rowsToTemplateRecords(rows: PerformanceRow[]): Json[] {
  return rows.map((row) => {
    const plan = fundingMap(getPlanFundingEntries(row))

    const record: Json = {
      "세부사업명(세목)": row.subProject,
      "상세분류(세세목)": row.detailCategory,
      월: monthToNumber(row.month),
      "계획인원(명)": row.planPeople,
      "계획횟수(회)": row.planCount,
      단비: "",
    }

    for (const column of TEMPLATE_FUNDING_COLUMNS) {
      record[column.header] = plan.get(column.source) ?? 0
    }

    record["내용"] = row.content
    record["메모"] = ""
    record["실적인원(명)"] = row.actualPeople
    record["실적횟수(회)"] = row.actualCount
    record["실적지출(원)"] = row.actualExpense

    return record
  })
}

/** 템플릿 레코드(업로드 파싱 결과) → 행 */
export function templateRecordsToRows(
  json: Json[],
  createId: () => string,
): PerformanceRow[] {
  return json
    .map((item) => {
      const subProject = toText(
        pick(item, "세부사업명(세목)", "세부사업명", "세목"),
      )
      const detailCategory = toText(
        pick(item, "상세분류(세세목)", "상세분류", "세세목", "세세분류(세세목)"),
      )
      const month = normalizeMonth(pick(item, "월"))

      const planFunding: PerformanceFundingEntry[] = []
      for (const column of TEMPLATE_FUNDING_COLUMNS) {
        const amount = toNumber(pick(item, column.header))
        if (amount > 0) planFunding.push({ source: column.source, amount })
      }
      const planBudget =
        planFunding.length > 0
          ? planFunding.reduce((sum, entry) => sum + entry.amount, 0)
          : toNumber(pick(item, "계획예산"))

      const row: PerformanceRow = {
        id: createId(),
        selected: false,
        subProject: subProject || "선택",
        detailCategory,
        month: month || "1월",
        planPeople: toNumber(pick(item, "계획인원(명)", "계획인원")),
        planCount: toNumber(pick(item, "계획횟수(회)", "계획횟수")),
        planBudget,
        actualPeople: toNumber(pick(item, "실적인원(명)", "실적인원")),
        actualCount: toNumber(pick(item, "실적횟수(회)", "실적횟수")),
        actualExpense: toNumber(pick(item, "실적지출(원)", "실적지출")),
        content: toText(pick(item, "내용")),
      }

      if (planFunding.length > 0) {
        row.planFunding = planFunding
        row.fundingSources = planFunding.map((entry) => entry.source)
      }

      return row
    })
    .filter(
      (row) =>
        row.subProject !== "선택" ||
        row.detailCategory ||
        row.planPeople ||
        row.planCount ||
        row.planBudget ||
        row.actualPeople ||
        row.actualCount ||
        row.actualExpense ||
        row.content,
    )
}
