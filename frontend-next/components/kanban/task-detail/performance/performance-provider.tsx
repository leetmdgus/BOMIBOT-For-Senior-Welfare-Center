"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  getInputManagementRows,
} from "@/services/kanban.performance.service"
import type {
  PerformanceRow,
  PerformanceSummaryRow,
} from "@/services/kanban.performance.types"

import { inputRowsToSummaryRows } from "./input-rows-to-summary"

export type RowData = PerformanceRow

export type CellKey = keyof Omit<RowData, "id" | "selected">

export const months = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
]

function aggregateBySubProject(rows: RowData[]) {
  const grouped: Record<
    string,
    {
      subProject: string
      planPeople: Record<string, number>
      planCount: Record<string, number>
      planBudget: Record<string, number>
      actualPeople: Record<string, number>
      actualCount: Record<string, number>
      actualExpense: Record<string, number>
    }
  > = {}

  rows.forEach((row) => {
    if (!grouped[row.subProject]) {
      grouped[row.subProject] = {
        subProject: row.subProject,
        planPeople: {},
        planCount: {},
        planBudget: {},
        actualPeople: {},
        actualCount: {},
        actualExpense: {},
      }
    }

    grouped[row.subProject].planPeople[row.month] =
      (grouped[row.subProject].planPeople[row.month] || 0) + row.planPeople
    grouped[row.subProject].planCount[row.month] =
      (grouped[row.subProject].planCount[row.month] || 0) + row.planCount
    grouped[row.subProject].planBudget[row.month] =
      (grouped[row.subProject].planBudget[row.month] || 0) + row.planBudget
    grouped[row.subProject].actualPeople[row.month] =
      (grouped[row.subProject].actualPeople[row.month] || 0) + row.actualPeople
    grouped[row.subProject].actualCount[row.month] =
      (grouped[row.subProject].actualCount[row.month] || 0) + row.actualCount
    grouped[row.subProject].actualExpense[row.month] =
      (grouped[row.subProject].actualExpense[row.month] || 0) + row.actualExpense
  })

  return Object.values(grouped)
}

const columns: CellKey[] = [
  "subProject",
  "detailCategory",
  "month",
  "planPeople",
  "planCount",
  "planBudget",
  "actualPeople",
  "actualCount",
  "actualExpense",
  "content",
]

export type PerformanceView = "input" | "plan" | "actual" | "result"

const PerformanceContext = createContext<{
  rows: RowData[]
  setRows: React.Dispatch<React.SetStateAction<RowData[]>>
  selectedCell: { rowId: string; column: CellKey } | null
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement>>
  columns: CellKey[]
  totals: {
    planPeople: number
    planCount: number
    planBudget: number
    actualPeople: number
    actualCount: number
    actualExpense: number
  }
  aggregatedData: ReturnType<typeof aggregateBySubProject>
  summaryRows: PerformanceSummaryRow[]
  selectedCount: number
  planVersion: string
  setPlanVersion: React.Dispatch<React.SetStateAction<string>>
  supplementVersions: string[]
  addSupplementaryBudget: () => void
  activeView: PerformanceView
  setActiveView: (view: PerformanceView) => void
  handleCellClick: (rowId: string, column: CellKey) => void
  handleCellChange: (rowId: string, column: CellKey, value: string | number) => void
  toggleRowSelection: (rowId: string) => void
  toggleAllSelection: () => void
  deleteSelectedRows: () => void
  copySelectedRows: () => void
  addRow: () => void
  getProgressRate: (plan: number, actual: number) => string
  getProgressColor: (plan: number, actual: number) => string
} | null>(null)

export function PerformanceProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [rows, setRows] = useState<RowData[]>([])
  const [activeView, setActiveView] = useState<PerformanceView>("input")
  const [supplementVersions, setSupplementVersions] = useState<string[]>([
    "기본계획",
  ])

  useEffect(() => {
    getInputManagementRows()
      .then(setRows)
      .catch((error) => {
        console.error("실적 데이터 로드 실패:", error)
      })
  }, [])
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string
    column: CellKey
  } | null>(null)
  const [planVersion, setPlanVersion] = useState("기본계획")
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const addSupplementaryBudget = useCallback(() => {
    if (!window.confirm("정말 추경하시겠습니까?")) return

    const nextLabel = `${supplementVersions.length}차추경` as const

    setSupplementVersions((prev) => [...prev, nextLabel])
    setPlanVersion(nextLabel)
  }, [supplementVersions.length])

  const aggregatedData = useMemo(() => aggregateBySubProject(rows), [rows])

  const summaryRows = useMemo(() => inputRowsToSummaryRows(rows), [rows])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          planPeople: acc.planPeople + row.planPeople,
          planCount: acc.planCount + row.planCount,
          planBudget: acc.planBudget + row.planBudget,
          actualPeople: acc.actualPeople + row.actualPeople,
          actualCount: acc.actualCount + row.actualCount,
          actualExpense: acc.actualExpense + row.actualExpense,
        }),
        {
          planPeople: 0,
          planCount: 0,
          planBudget: 0,
          actualPeople: 0,
          actualCount: 0,
          actualExpense: 0,
        }
      ),
    [rows]
  )

  const selectedCount = useMemo(
    () => rows.filter((row) => row.selected).length,
    [rows]
  )

  const handleCellClick = useCallback((rowId: string, column: CellKey) => {
    setSelectedCell({ rowId, column })

    setTimeout(() => {
      inputRefs.current.get(`${rowId}-${column}`)?.focus()
      inputRefs.current.get(`${rowId}-${column}`)?.select()
    }, 0)
  }, [])

  const handleCellChange = useCallback(
    (rowId: string, column: CellKey, value: string | number) => {
      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                [column]: value,
              }
            : row
        )
      )
    },
    []
  )

  const toggleRowSelection = useCallback((rowId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              selected: !row.selected,
            }
          : row
      )
    )
  }, [])

  const toggleAllSelection = useCallback(() => {
    setRows((prev) => {
      const allSelected = prev.every((row) => row.selected)

      return prev.map((row) => ({
        ...row,
        selected: !allSelected,
      }))
    })
  }, [])

  const deleteSelectedRows = useCallback(() => {
    setRows((prev) => prev.filter((row) => !row.selected))
  }, [])

  const copySelectedRows = useCallback(() => {
    setRows((prev) => {
      const selectedRows = prev.filter((row) => row.selected)

      return [
        ...prev,
        ...selectedRows.map((row, index) => ({
          ...row,
          id: `copy-${Date.now()}-${index}`,
          selected: false,
        })),
      ]
    })
  }, [])

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        selected: false,
        subProject: "신규회원 이용상담",
        detailCategory: "",
        month: "1월",
        planPeople: 0,
        planCount: 0,
        planBudget: 0,
        actualPeople: 0,
        actualCount: 0,
        actualExpense: 0,
        content: "",
      },
    ])
  }, [])

  const getProgressRate = useCallback((plan: number, actual: number) => {
    if (plan === 0) return "-"

    return `${Math.round((actual / plan) * 100)}%`
  }, [])

  const getProgressColor = useCallback((plan: number, actual: number) => {
    if (plan === 0) return "text-muted-foreground"

    const rate = (actual / plan) * 100

    if (rate >= 100) return "text-green-600"
    if (rate >= 80) return "text-amber-600"

    return "text-red-500"
  }, [])

  return (
    <PerformanceContext.Provider
      value={{
        rows,
        setRows,
        selectedCell,
        inputRefs,
        columns,
        totals,
        aggregatedData,
        summaryRows,
        selectedCount,
        planVersion,
        setPlanVersion,
        supplementVersions,
        addSupplementaryBudget,
        activeView,
        setActiveView,
        handleCellClick,
        handleCellChange,
        toggleRowSelection,
        toggleAllSelection,
        deleteSelectedRows,
        copySelectedRows,
        addRow,
        getProgressRate,
        getProgressColor,
      }}
    >
      {children}
    </PerformanceContext.Provider>
  )
}

export function usePerformance() {
  const context = useContext(PerformanceContext)

  if (!context) {
    throw new Error("usePerformance must be used within PerformanceProvider")
  }

  return context
}