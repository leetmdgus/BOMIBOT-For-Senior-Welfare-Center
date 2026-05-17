"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"

export interface RowData {
  id: string
  selected: boolean
  subProject: string
  detailCategory: string
  month: string
  planPeople: number
  planCount: number
  planBudget: number
  actualPeople: number
  actualCount: number
  actualExpense: number
  content: string
}

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

const initialRows: RowData[] = [
  {
    id: "1",
    selected: false,
    subProject: "신규회원 이용상담",
    detailCategory: "--",
    month: "1월",
    planPeople: 80,
    planCount: 80,
    planBudget: 0,
    actualPeople: 127,
    actualCount: 127,
    actualExpense: 0,
    content: "신규회원 이용상담",
  },
  {
    id: "2",
    selected: false,
    subProject: "신규회원 가입",
    detailCategory: "--",
    month: "1월",
    planPeople: 80,
    planCount: 80,
    planBudget: 0,
    actualPeople: 127,
    actualCount: 127,
    actualExpense: 0,
    content: "신규회원 가입",
  },
  {
    id: "3",
    selected: false,
    subProject: "신규회원 교육",
    detailCategory: "--",
    month: "1월",
    planPeople: 80,
    planCount: 80,
    planBudget: 0,
    actualPeople: 116,
    actualCount: 116,
    actualExpense: 0,
    content: "신규회원 교육",
  },
  {
    id: "4",
    selected: false,
    subProject: "정보제공상담",
    detailCategory: "--",
    month: "2월",
    planPeople: 8,
    planCount: 8,
    planBudget: 0,
    actualPeople: 0,
    actualCount: 0,
    actualExpense: 0,
    content: "정보제공상담",
  },
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
  "content",
]

const PerformanceContext = createContext<any>(null)

export function PerformanceProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [rows, setRows] = useState<RowData[]>(initialRows)
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string
    column: CellKey
  } | null>(null)
  const [planVersion, setPlanVersion] = useState("기본계획")
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const aggregatedData = useMemo(() => aggregateBySubProject(rows), [rows])

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
        detailCategory: "--",
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
        selectedCell,
        inputRefs,
        columns,
        totals,
        aggregatedData,
        selectedCount,
        planVersion,
        setPlanVersion,
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