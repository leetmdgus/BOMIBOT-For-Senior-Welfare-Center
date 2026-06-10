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
import { isFastApiMode } from "@/lib/api-client"
import {
  getInputManagementRows,
  saveInputManagementRows,
} from "@/services/kanban.performance.service"
import type {
  PerformanceRow,
  PerformanceSummaryRow,
  PlanSnapshot,
} from "@/services/kanban.performance.types"

import type {
  PerformanceViewMode,
  SummaryFundingSourceFilter,
  SummaryMonthFilter,
} from "./performance-summary.constants"
import { inputRowsToSummaryRows } from "./input-rows-to-summary"
import {
  clonePerformanceRows,
  isSelectionOnlyRowsChange,
  rowsSnapshotEqual,
  ROWS_HISTORY_LIMIT,
} from "./performance-rows-history"

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

const createSnapshotId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `snapshot-${Date.now()}-${Math.random()}`

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
  undoRows: () => void
  redoRows: () => void
  canUndoRows: boolean
  canRedoRows: boolean
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
  /** 동결된 이전 추경 버전 스택 (활성 버전 미포함) */
  snapshots: PlanSnapshot[]
  /** 읽기전용으로 보고 있는 스냅샷 id (활성 편집 중이면 null) */
  viewingSnapshotId: string | null
  setViewingSnapshot: (id: string | null) => void
  addSupplementaryBudget: () => void
  /** 최신(활성) 추경 버전 삭제 → 직전 스냅샷 편집 복원 */
  deleteActiveSupplement: () => void
  activeView: PerformanceView
  setActiveView: (view: PerformanceView) => void
  summaryMonth: SummaryMonthFilter
  setSummaryMonth: (month: SummaryMonthFilter) => void
  summaryFundingSource: SummaryFundingSourceFilter
  setSummaryFundingSource: (source: SummaryFundingSourceFilter) => void
  summaryViewMode: PerformanceViewMode
  setSummaryViewMode: (mode: PerformanceViewMode) => void
  summaryFocusedSubProject: string | null
  summaryFocusedDetailCategory: string | null
  setSummaryFocusedSubProject: (value: string | null) => void
  setSummaryFocusedDetailCategory: (value: string | null) => void
  resetSummaryRowFilter: () => void
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
  taskId,
}: {
  children: React.ReactNode
  taskId: string
}) {
  const [rows, setRowsState] = useState<RowData[]>([])
  const taskIdRef = useRef(taskId)
  const rowsRef = useRef<RowData[]>([])
  const pastRef = useRef<RowData[][]>([])
  const futureRef = useRef<RowData[][]>([])
  const [historyTick, setHistoryTick] = useState(0)

  const [activeView, setActiveView] = useState<PerformanceView>("input")
  const [summaryMonth, setSummaryMonth] = useState<SummaryMonthFilter>("전체")
  const [summaryFundingSource, setSummaryFundingSource] =
    useState<SummaryFundingSourceFilter>("all")
  const [summaryViewMode, setSummaryViewMode] =
    useState<PerformanceViewMode>("subProject")
  const [summaryFocusedSubProject, setSummaryFocusedSubProject] = useState<
    string | null
  >(null)
  const [summaryFocusedDetailCategory, setSummaryFocusedDetailCategory] =
    useState<string | null>(null)

  const resetSummaryRowFilter = useCallback(() => {
    setSummaryFocusedSubProject(null)
    setSummaryFocusedDetailCategory(null)
  }, [])
  const [supplementVersions, setSupplementVersions] = useState<string[]>([
    "기본계획",
  ])
  const [snapshots, setSnapshots] = useState<PlanSnapshot[]>([])
  const [viewingSnapshotId, setViewingSnapshotId] = useState<string | null>(
    null,
  )

  const applyRows = useCallback((next: RowData[]) => {
    rowsRef.current = next
    setRowsState(next)
  }, [])

  const bumpHistory = useCallback(() => {
    setHistoryTick((n) => n + 1)
  }, [])

  useEffect(() => {
    taskIdRef.current = taskId
  }, [taskId])

  const resetHistory = useCallback(() => {
    pastRef.current = []
    futureRef.current = []
    bumpHistory()
  }, [bumpHistory])

  const commitRows = useCallback(
    (next: RowData[], options?: { recordHistory?: boolean }) => {
      const prev = rowsRef.current
      if (rowsSnapshotEqual(prev, next)) return

      const record = options?.recordHistory !== false

      if (record && !isSelectionOnlyRowsChange(prev, next)) {
        pastRef.current = [
          ...pastRef.current.slice(-(ROWS_HISTORY_LIMIT - 1)),
          clonePerformanceRows(prev),
        ]
        futureRef.current = []
        bumpHistory()
      }

      applyRows(next)

      if (
        isFastApiMode() &&
        record &&
        !isSelectionOnlyRowsChange(prev, next)
      ) {
        const ownerTaskId = taskIdRef.current
        if (!ownerTaskId) return
        const payload = clonePerformanceRows(next)
        void saveInputManagementRows(payload, ownerTaskId).catch((error) => {
          console.error("실적 데이터 저장 실패:", error)
        })
      }
    },
    [applyRows, bumpHistory],
  )

  const setRows = useCallback(
    (action: React.SetStateAction<RowData[]>) => {
      const prev = rowsRef.current
      const next = typeof action === "function" ? action(prev) : action
      commitRows(next)
    },
    [commitRows],
  )

  const setRowsWithoutHistory = useCallback(
    (action: React.SetStateAction<RowData[]>) => {
      const prev = rowsRef.current
      const next = typeof action === "function" ? action(prev) : action
      if (rowsSnapshotEqual(prev, next)) return
      applyRows(next)
      resetHistory()
    },
    [applyRows, resetHistory],
  )

  useEffect(() => {
    setRowsState([])
    rowsRef.current = []
    pastRef.current = []
    futureRef.current = []
    setHistoryTick((n) => n + 1)
    setActiveView("input")
    setPlanVersion("기본계획")
    setSupplementVersions(["기본계획"])
    setSnapshots([])
    setViewingSnapshotId(null)
    setSelectedCell(null)
    setSummaryMonth("전체")
    setSummaryFundingSource("all")
    setSummaryViewMode("subProject")
    setSummaryFocusedSubProject(null)
    setSummaryFocusedDetailCategory(null)
  }, [taskId])

  useEffect(() => {
    if (!taskId) return

    const loadFor = taskId
    getInputManagementRows(loadFor)
      .then((loaded) => {
        if (taskIdRef.current !== loadFor) return
        setRowsWithoutHistory(loaded)
      })
      .catch((error) => {
        if (taskIdRef.current !== loadFor) return
        console.error("실적 데이터 로드 실패:", error)
      })
  }, [setRowsWithoutHistory, taskId])

  const undoRows = useCallback(() => {
    const past = pastRef.current
    if (past.length === 0) return

    const previous = past[past.length - 1]
    pastRef.current = past.slice(0, -1)
    futureRef.current = [
      clonePerformanceRows(rowsRef.current),
      ...futureRef.current,
    ].slice(0, ROWS_HISTORY_LIMIT)
    applyRows(clonePerformanceRows(previous))
    bumpHistory()
  }, [applyRows, bumpHistory])

  const redoRows = useCallback(() => {
    const future = futureRef.current
    if (future.length === 0) return

    const [next, ...rest] = future
    futureRef.current = rest
    pastRef.current = [
      ...pastRef.current,
      clonePerformanceRows(rowsRef.current),
    ].slice(-ROWS_HISTORY_LIMIT)
    applyRows(clonePerformanceRows(next))
    bumpHistory()
  }, [applyRows, bumpHistory])

  const canUndoRows = useMemo(
    () => pastRef.current.length > 0,
    [historyTick],
  )

  const canRedoRows = useMemo(
    () => futureRef.current.length > 0,
    [historyTick],
  )

  const [selectedCell, setSelectedCell] = useState<{
    rowId: string
    column: CellKey
  } | null>(null)
  const [planVersion, setPlanVersion] = useState("기본계획")
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const addSupplementaryBudget = useCallback(() => {
    if (
      !window.confirm(
        `정말 추경하시겠습니까?\n현재 '${planVersion}' 데이터가 스냅샷으로 보관되고, 새 추경 버전에서 편집합니다.`,
      )
    )
      return

    const frozenRows = clonePerformanceRows(rowsRef.current).map((row) => ({
      ...row,
      selected: false,
    }))
    const snapshot: PlanSnapshot = {
      id: createSnapshotId(),
      label: planVersion,
      rows: frozenRows,
      createdAt: new Date().toISOString(),
    }
    const nextLabel = `${snapshots.length + 1}차추경`

    setSnapshots((prev) => [...prev, snapshot])
    setSupplementVersions((prev) => [...prev, nextLabel])
    setPlanVersion(nextLabel)
    setViewingSnapshotId(null)
  }, [planVersion, snapshots.length])

  const deleteActiveSupplement = useCallback(() => {
    if (snapshots.length === 0) return

    const last = snapshots[snapshots.length - 1]
    if (
      !window.confirm(
        `현재 '${planVersion}' 추경 버전을 삭제하고 '${last.label}'을(를) 다시 편집하시겠습니까?\n'${planVersion}'에서 입력한 내용은 사라집니다.`,
      )
    )
      return

    setSnapshots((prev) => prev.slice(0, -1))
    setSupplementVersions((prev) => prev.slice(0, -1))
    setPlanVersion(last.label)
    setViewingSnapshotId(null)
    setRowsWithoutHistory(clonePerformanceRows(last.rows))
  }, [snapshots, planVersion, setRowsWithoutHistory])

  const setViewingSnapshot = useCallback((id: string | null) => {
    setViewingSnapshotId(id)
  }, [])

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
        },
      ),
    [rows],
  )

  const selectedCount = useMemo(
    () => rows.filter((row) => row.selected).length,
    [rows],
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
            : row,
        ),
      )
    },
    [setRows],
  )

  const toggleRowSelection = useCallback(
    (rowId: string) => {
      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                selected: !row.selected,
              }
            : row,
        ),
      )
    },
    [setRows],
  )

  const toggleAllSelection = useCallback(() => {
    setRows((prev) => {
      const allSelected = prev.every((row) => row.selected)

      return prev.map((row) => ({
        ...row,
        selected: !allSelected,
      }))
    })
  }, [setRows])

  const deleteSelectedRows = useCallback(() => {
    setRows((prev) => prev.filter((row) => !row.selected))
  }, [setRows])

  const copySelectedRows = useCallback(() => {
    setRows((prev) => {
      const selectedRows = prev.filter((row) => row.selected)

      return [
        ...prev,
        ...selectedRows.map((row, index) => ({
          ...row,
          id: `copy-${Date.now()}-${index}`,
          selected: false,
          taskId: taskIdRef.current || row.taskId,
        })),
      ]
    })
  }, [setRows])

  const addRow = useCallback(() => {
    const ownerTaskId = taskIdRef.current
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        selected: false,
        subProject: "",
        detailCategory: "",
        month: "1월",
        planPeople: 0,
        planCount: 0,
        planBudget: 0,
        actualPeople: 0,
        actualCount: 0,
        actualExpense: 0,
        content: "",
        taskId: ownerTaskId,
      },
    ])
  }, [setRows])

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
        undoRows,
        redoRows,
        canUndoRows,
        canRedoRows,
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
        snapshots,
        viewingSnapshotId,
        setViewingSnapshot,
        addSupplementaryBudget,
        deleteActiveSupplement,
        activeView,
        setActiveView,
        summaryMonth,
        setSummaryMonth,
        summaryFundingSource,
        setSummaryFundingSource,
        summaryViewMode,
        setSummaryViewMode,
        summaryFocusedSubProject,
        summaryFocusedDetailCategory,
        setSummaryFocusedSubProject,
        setSummaryFocusedDetailCategory,
        resetSummaryRowFilter,
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
