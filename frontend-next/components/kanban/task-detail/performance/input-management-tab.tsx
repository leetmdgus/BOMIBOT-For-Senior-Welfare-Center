"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { PerformanceRow } from "@/services/kanban.performance.types"
import * as XLSX from "xlsx"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  Download,
  Eye,
  HelpCircle,
  Layers,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getPerformanceInputMeta } from "@/services/kanban.performance.service"
import type { PerformanceSubProjectChip } from "@/services/kanban.performance.types"
import { formatKstDateTime } from "@/lib/datetime-kst"

import { usePerformance } from "./performance-provider"
import { InputManagementExcelGrid } from "./input-management-excel-grid"
import {
  TEMPLATE_HEADERS,
  rowsToTemplateRecords,
  templateRecordsToRows,
} from "./input-management-template-io"
import {
  cloneRowForClipboard,
  isEditableTarget,
  rowFromClipboardEntry,
  rowsToTsv,
  type RowClipboardEntry,
} from "./input-management-row-selection"

type RowData = PerformanceRow

const months = [
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

const NAS_SEARCH_FIELDS = [
  "NAS 검색 필드 1",
  "NAS 검색 필드 2",
  "NAS 검색 필드 3",
  "NAS 검색 필드 4",
  "NAS 검색 필드 5",
]

const DEFAULT_ROW_BATCH = 10

/** 드롭다운에서 '활성(편집 중) 버전' 항목을 식별하는 sentinel id */
const ACTIVE_VERSION_ID = "__active__"

type SortDirection = "asc" | "desc" | null
type SortColumn = "subProject" | "detailCategory" | "month"

function monthToOrder(month: string) {
  const match = month.match(/^(\d{1,2})\s*월/)
  return match ? Number(match[1]) : 999
}

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

export function InputManagementTab() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const tableScrollRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const rowSelectAnchorRef = useRef<string | null>(null)
  const rowClipboardRef = useRef<RowClipboardEntry[]>([])

  const {
    rows,
    setRows,
    undoRows,
    redoRows,
    canUndoRows,
    canRedoRows,
    addSupplementaryBudget,
    deleteActiveSupplement,
    planVersion,
    snapshots,
    viewingSnapshotId,
    setViewingSnapshot,
    deleteSelectedRows,
  } = usePerformance()

  const viewingSnapshot = useMemo(
    () =>
      viewingSnapshotId
        ? snapshots.find((snapshot) => snapshot.id === viewingSnapshotId) ?? null
        : null,
    [viewingSnapshotId, snapshots],
  )
  const isViewingSnapshot = viewingSnapshot !== null
  const sourceRows = isViewingSnapshot ? viewingSnapshot.rows : rows

  const versionEntries = useMemo(
    () => [
      ...snapshots.map((snapshot) => ({
        id: snapshot.id,
        label: snapshot.label,
        createdAt: snapshot.createdAt as string | null,
        isActive: false,
      })),
      {
        id: ACTIVE_VERSION_ID,
        label: planVersion,
        createdAt: null as string | null,
        isActive: true,
      },
    ],
    [snapshots, planVersion],
  )
  const currentVersionLabel = viewingSnapshot
    ? viewingSnapshot.label
    : planVersion

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [viewAllMonths, setViewAllMonths] = useState(false)

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showActualModal, setShowActualModal] = useState(false)
  const [actualModalRowId, setActualModalRowId] = useState<string | null>(null)

  const [subProjectSort, setSubProjectSort] = useState<SortDirection>(null)
  const [detailCategorySort, setDetailCategorySort] = useState<SortDirection>(
    null,
  )
  const [monthSort, setMonthSort] = useState<SortDirection>(null)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)

  const [projectItems, setProjectItems] = useState<PerformanceSubProjectChip[]>(
    [],
  )

  const [detailCategoryItems, setDetailCategoryItems] = useState<
    { id: number; label: string }[]
  >([])

  useEffect(() => {
    getPerformanceInputMeta()
      .then((meta) => {
        setProjectItems(meta.subProjectChips)
        setDetailCategoryItems(
          meta.detailCategories.map((label, index) => ({
            id: index + 1,
            label,
          })),
        )
      })
      .catch((error) => {
        console.error("실적 입력 메타 로드 실패:", error)
      })
  }, [])

  // 세목(세부사업명) 자동완성 — 세세목과 동일하게 등록분 + 표에 입력된 값을 합친다.
  const subProjectSuggestions = useMemo(() => {
    const fromRows = rows
      .map((row) => row.subProject.trim())
      .filter(
        (value) => value && value !== "선택" && value !== "—" && value !== "--",
      )

    return [
      ...new Set([
        ...projectItems.map((item) => item.label).filter(Boolean),
        ...fromRows,
      ]),
    ]
  }, [rows, projectItems])

  const detailCategorySuggestions = useMemo(() => {
    const fromRows = rows
      .map((row) => row.detailCategory.trim())
      .filter(
        (value) => value && value !== "—" && value !== "--" && value !== "선택",
      )

    return [
      ...new Set([
        ...detailCategoryItems.map((item) => item.label).filter(Boolean),
        ...fromRows,
      ]),
    ]
  }, [rows, detailCategoryItems])

  const filteredRows = useMemo(() => {
    if (viewAllMonths) return sourceRows

    const monthLabel = `${selectedMonth}월`
    return sourceRows.filter((row) => row.month === monthLabel)
  }, [sourceRows, viewAllMonths, selectedMonth])

  const displayedRows = useMemo(() => {
    const next = [...filteredRows]

    if (subProjectSort) {
      next.sort((a, b) => {
        const compared = a.subProject.localeCompare(b.subProject, "ko")
        return subProjectSort === "asc" ? compared : -compared
      })
    }

    if (detailCategorySort) {
      next.sort((a, b) => {
        const compared = a.detailCategory.localeCompare(b.detailCategory, "ko")
        return detailCategorySort === "asc" ? compared : -compared
      })
    }

    if (monthSort) {
      next.sort((a, b) => {
        const compared = monthToOrder(a.month) - monthToOrder(b.month)
        if (compared !== 0) {
          return monthSort === "asc" ? compared : -compared
        }
        const bySubProject = a.subProject.localeCompare(b.subProject, "ko")
        if (bySubProject !== 0) return bySubProject
        return a.detailCategory.localeCompare(b.detailCategory, "ko")
      })
    }

    return next
  }, [filteredRows, subProjectSort, detailCategorySort, monthSort])

  const actualModalRow = useMemo(
    () => rows.find((row) => row.id === actualModalRowId) ?? null,
    [rows, actualModalRowId]
  )

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, index) => current - 2 + index)
  }, [])

  const totals = useMemo(() => {
    return displayedRows.reduce(
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
    )
  }, [displayedRows])

  const selectedDisplayedCount = useMemo(
    () => displayedRows.filter((row) => row.selected).length,
    [displayedRows],
  )

  const allDisplayedSelected =
    displayedRows.length > 0 &&
    displayedRows.every((row) => row.selected)

  const isRowOrderLocked =
    subProjectSort !== null ||
    detailCategorySort !== null ||
    monthSort !== null

  const selectedDisplayedRows = useMemo(
    () => displayedRows.filter((row) => row.selected),
    [displayedRows],
  )

  const canMoveSelectedRow =
    !isRowOrderLocked &&
    selectedDisplayedRows.length === 1 &&
    displayedRows.length > 1

  const updateRow = <K extends keyof RowData>(
    id: string,
    key: K,
    value: RowData[K],
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [key]: value } : row,
      ),
    )
  }

  const addRows = (count = DEFAULT_ROW_BATCH) => {
    if (isViewingSnapshot) return

    const monthLabel = viewAllMonths
      ? `${selectedMonth}월`
      : `${selectedMonth}월`

    const nextRows: RowData[] = Array.from({ length: count }).map(() => ({
      id: createId(),
      selected: false,
      subProject: "선택",
      detailCategory: "",
      month: monthLabel,
      planPeople: 0,
      planCount: 0,
      planBudget: 0,
      actualPeople: 0,
      actualCount: 0,
      actualExpense: 0,
      content: "",
    }))

    setRows((prev) => [...prev, ...nextRows])

    requestAnimationFrame(() => {
      const wrapper = tableScrollRef.current
      const lastRow = wrapper?.querySelector("tbody tr:last-child")
      lastRow?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    })
  }

  const toggleAllDisplayedSelection = () => {
    const displayedIds = new Set(displayedRows.map((row) => row.id))
    const nextSelected = !allDisplayedSelected

    setRows((prev) =>
      prev.map((row) =>
        displayedIds.has(row.id) ? { ...row, selected: nextSelected } : row,
      ),
    )

    if (nextSelected && displayedRows[0]) {
      rowSelectAnchorRef.current = displayedRows[0].id
    }
  }

  const handleRowSelect = useCallback(
    (rowId: string, shiftKey: boolean) => {
      const displayedIds = displayedRows.map((row) => row.id)

      if (shiftKey && rowSelectAnchorRef.current) {
        const anchorIndex = displayedIds.indexOf(rowSelectAnchorRef.current)
        const clickIndex = displayedIds.indexOf(rowId)

        if (anchorIndex >= 0 && clickIndex >= 0) {
          const [from, to] =
            anchorIndex <= clickIndex
              ? [anchorIndex, clickIndex]
              : [clickIndex, anchorIndex]
          const rangeIds = new Set(displayedIds.slice(from, to + 1))

          setRows((prev) =>
            prev.map((row) => ({
              ...row,
              selected: rangeIds.has(row.id),
            })),
          )
          return
        }
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, selected: !row.selected } : row,
        ),
      )
      rowSelectAnchorRef.current = rowId
    },
    [displayedRows, setRows],
  )

  const copySelectedDisplayedRows = useCallback(async () => {
    const selected = displayedRows.filter((row) => row.selected)
    if (selected.length === 0) return

    rowClipboardRef.current = selected.map(cloneRowForClipboard)

    try {
      await navigator.clipboard.writeText(rowsToTsv(selected))
    } catch {
      // ignore clipboard errors
    }
  }, [displayedRows])

  const pasteRowsBelowSelection = useCallback(() => {
    const clipboard = rowClipboardRef.current
    if (clipboard.length === 0) return

    const selectedInDisplay = displayedRows.filter((row) => row.selected)
    const newRows = clipboard.map((template) =>
      rowFromClipboardEntry(template, createId),
    )
    const newIds = new Set(newRows.map((row) => row.id))

    setRows((prev) => {
      let next: RowData[]

      if (selectedInDisplay.length === 0) {
        next = [...prev, ...newRows]
      } else {
        const anchor = selectedInDisplay[selectedInDisplay.length - 1]
        const insertIndex = prev.findIndex((row) => row.id === anchor.id)

        if (insertIndex < 0) {
          next = [...prev, ...newRows]
        } else {
          next = [...prev]
          next.splice(insertIndex + 1, 0, ...newRows)
        }
      }

      return next.map((row) => ({
        ...row,
        selected: newIds.has(row.id),
      }))
    })

    if (newRows[0]) {
      rowSelectAnchorRef.current = newRows[0].id
    }
  }, [displayedRows, setRows])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isViewingSnapshot) return

      if (!panelRef.current?.contains(document.activeElement)) {
        const active = document.activeElement
        if (
          active !== document.body &&
          !panelRef.current?.contains(active)
        ) {
          return
        }
      }

      if (isEditableTarget(event.target) && event.key !== "Delete") return

      const hasSelected = selectedDisplayedCount > 0

      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase()

        if (key === "z" && !event.shiftKey && canUndoRows) {
          event.preventDefault()
          undoRows()
          return
        }

        if (
          (key === "y" || (key === "z" && event.shiftKey)) &&
          canRedoRows
        ) {
          event.preventDefault()
          redoRows()
          return
        }
      }

      if (event.key === "Delete" && hasSelected) {
        event.preventDefault()
        deleteSelectedRows()
        rowSelectAnchorRef.current = null
        return
      }

      if (!(event.ctrlKey || event.metaKey)) return

      const key = event.key.toLowerCase()

      if (key === "z" || key === "y") return

      if (key === "c" && hasSelected) {
        event.preventDefault()
        void copySelectedDisplayedRows()
        return
      }

      if (key === "v" && rowClipboardRef.current.length > 0) {
        event.preventDefault()
        pasteRowsBelowSelection()
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [
    copySelectedDisplayedRows,
    deleteSelectedRows,
    pasteRowsBelowSelection,
    selectedDisplayedCount,
    isViewingSnapshot,
    canUndoRows,
    canRedoRows,
    undoRows,
    redoRows,
  ])

  const exportExcel = () => {
    // 업로드 템플릿과 동일한 컬럼 형식(재원 항목 분리)으로 CSV 다운로드.
    // 한글이 엑셀에서 깨지지 않도록 UTF-8 BOM 을 붙인다.
    const sheet = XLSX.utils.json_to_sheet(rowsToTemplateRecords(sourceRows), {
      header: TEMPLATE_HEADERS,
    })
    const csv = XLSX.utils.sheet_to_csv(sheet)
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "계획실적_입력관리.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const importExcel = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

    // 템플릿(신 양식: 재원 컬럼 분리) 및 구 양식(계획예산 단일) 모두 허용.
    const importedRows = templateRecordsToRows(json, createId)

    setRows((prev) => [...prev, ...importedRows])
    event.target.value = ""
  }

  const loadFromNas = (fieldName: string) => {
    const importedRows: RowData[] = Array.from({ length: 3 }).map((_, index) => ({
      id: createId(),
      selected: false,
      subProject: fieldName,
      detailCategory: "—",
      month: `${selectedMonth}월`,
      planPeople: 0,
      planCount: 1,
      planBudget: 50000,
      actualPeople: 0,
      actualCount: 0,
      actualExpense: 0,
      content: `${fieldName} NAS 불러오기 ${index + 1}`,
    }))

    setRows((prev) => [...prev, ...importedRows])
  }

  const openActualModal = (rowId: string) => {
    setActualModalRowId(rowId)
    setShowActualModal(true)
  }

  const toggleSort = (column: SortColumn, current: SortDirection) => {
    const next =
      current === null ? "asc" : current === "asc" ? "desc" : null

    setSubProjectSort(column === "subProject" ? next : null)
    setDetailCategorySort(column === "detailCategory" ? next : null)
    setMonthSort(column === "month" ? next : null)
  }

  const toggleMonthSortView = () => {
    setSubProjectSort(null)
    setDetailCategorySort(null)
    setMonthSort((prev) => (prev === "asc" ? null : "asc"))
  }

  const leaveAllMonthsView = () => {
    setViewAllMonths(false)
    setMonthSort(null)
  }

  const goPrevMonth = () => {
    leaveAllMonthsView()
    setSelectedMonth((prev) => (prev <= 1 ? 12 : prev - 1))
  }

  const goNextMonth = () => {
    leaveAllMonthsView()
    setSelectedMonth((prev) => (prev >= 12 ? 1 : prev + 1))
  }

  const mergeDisplayedRows = (nextDisplayed: RowData[]) => {
    const displayedIds = new Set(nextDisplayed.map((row) => row.id))
    const queue = [...nextDisplayed]

    setRows((prev) =>
      prev.map((row) => {
        if (!displayedIds.has(row.id)) return row
        return queue.shift() as RowData
      }),
    )
  }

  const reorderDisplayedRows = (nextDisplayed: RowData[]) => {
    mergeDisplayedRows(nextDisplayed)
  }

  const moveDisplayedRow = (direction: "up" | "down") => {
    if (!canMoveSelectedRow) return

    const selectedId = selectedDisplayedRows[0]?.id
    const currentIndex = displayedRows.findIndex((row) => row.id === selectedId)
    if (currentIndex < 0) return

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= displayedRows.length) return

    reorderDisplayedRows(arrayMove(displayedRows, currentIndex, targetIndex))
  }

  const dragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const handleRowDragEnd = (event: DragEndEvent) => {
    if (isRowOrderLocked) return

    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = displayedRows.findIndex((row) => row.id === active.id)
    const newIndex = displayedRows.findIndex((row) => row.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    reorderDisplayedRows(arrayMove(displayedRows, oldIndex, newIndex))
  }

  return (
    <div
      ref={panelRef}
      className="relative w-full rounded border border-slate-300 bg-white text-slate-900"
      onClick={() => {
        setContextMenu(null)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
        })
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={importExcel}
      />

      <div className="print-hide flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-4">
        <h2 className="text-3xl font-bold tracking-tight">계획/실적 입력관리</h2>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground">
              <HelpCircle className="size-5" />
            </button>
          </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="start"
              className="max-w-md space-y-1 text-sm leading-relaxed"
            >
              <p className="font-semibold">계획/실적 입력관리</p>
              <p>
                여기서 입력·수정한 내용이 사업계획·사업실적·사업결과 탭에
                동일하게 반영됩니다.
              </p>
              <p>
                <strong>세세목(상세분류)</strong>은 행 추가 후 세부사업명(세목) 옆
                열에서 입력합니다. 같은 세목이라도 세세목·월이 다르면 행을 나눕니다.
              </p>
              <p>
                엑셀처럼 셀을 클릭해 직접 입력할 수 있습니다. 복사(Ctrl+C)·붙여넣기(Ctrl+V),
                실행 취소(Ctrl+Z)·다시 실행(Ctrl+Y), 범위 선택(Shift+클릭), 셀 모서리 드래그로 채우기가 지원됩니다.
              </p>
              <p>
                기존 파일을 업로드할 수 있으며, 이미 저장된 행 아래에 파일의
                행이 추가됩니다. 엑셀 양식의 「상세분류」 열에 세세목을 적어 업로드할 수 있습니다.
              </p>
              <p>실적 칸은 더블클릭하면 진행내역 입력 창이 열립니다.</p>
            </TooltipContent>
        </Tooltip>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isViewingSnapshot}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Download className="size-4" />
                  불러오기
                  <ChevronDown className="size-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  NAS 검색 필드
                </DropdownMenuLabel>
                {NAS_SEARCH_FIELDS.map((field) => (
                  <DropdownMenuItem
                    key={field}
                    onClick={() => loadFromNas(field)}
                  >
                    {field}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isViewingSnapshot}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            업로드
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={exportExcel}
          >
            <Download className="size-4" />
            다운로드
          </Button>
        </div>
      </div>

      <div className="print-hide flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
        <select
          value={String(selectedYear)}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>

        <select
          value={String(selectedMonth)}
          onChange={(event) => {
            leaveAllMonthsView()
            setSelectedMonth(Number(event.target.value))
          }}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          {months.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant={viewAllMonths ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setViewAllMonths(true)
            if (monthSort === null) {
              setSubProjectSort(null)
              setDetailCategorySort(null)
              setMonthSort("asc")
            }
          }}
        >
          전체
        </Button>

        <Button type="button" variant="outline" size="icon" onClick={goPrevMonth}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={goNextMonth}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="mx-5 mb-5 flex flex-col rounded-lg border border-slate-300">
        <div className="print-hide shrink-0 space-y-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-xs text-muted-foreground">
            적용 추경: {planVersion}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant={isViewingSnapshot ? "default" : "outline"}
                className="gap-1.5"
                onClick={(event) => event.stopPropagation()}
              >
                <Layers className="size-3.5" />
                버전: {currentVersionLabel}
                {isViewingSnapshot ? (
                  <span className="rounded bg-white/20 px-1 text-[10px]">
                    읽기전용
                  </span>
                ) : null}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                추경 스냅샷 / 버전
              </DropdownMenuLabel>
              {versionEntries.map((entry) => {
                const isSelected = entry.isActive
                  ? !isViewingSnapshot
                  : entry.id === viewingSnapshotId
                return (
                  <DropdownMenuItem
                    key={entry.id}
                    onClick={() =>
                      setViewingSnapshot(entry.isActive ? null : entry.id)
                    }
                    className="flex items-start gap-2"
                  >
                    <span className="mt-0.5 w-4 shrink-0">
                      {isSelected ? <Check className="size-4" /> : null}
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="flex items-center gap-1.5 font-medium">
                        {entry.label}
                        {entry.isActive ? (
                          <span className="rounded bg-emerald-100 px-1 text-[10px] text-emerald-700">
                            편집
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1 text-[10px] text-slate-500">
                            <Eye className="size-3" /> 읽기전용
                          </span>
                        )}
                      </span>
                      {entry.createdAt ? (
                        <span className="text-[11px] text-muted-foreground">
                          {formatKstDateTime(entry.createdAt)} 동결
                        </span>
                      ) : null}
                    </span>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isViewingSnapshot}
                onClick={addSupplementaryBudget}
              >
                <Plus className="size-4" />
                추경 추가
              </DropdownMenuItem>
              {snapshots.length > 0 ? (
                <DropdownMenuItem
                  disabled={isViewingSnapshot}
                  onClick={deleteActiveSupplement}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" />
                  현재 추경 삭제 ({planVersion})
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground">
                <HelpCircle className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-sm">
              추경을 누르면 현재 데이터가 스냅샷으로 보관되고 새 버전에서 편집합니다.
              사업실적·사업결과에는 최신 추경이 적용됩니다.
            </TooltipContent>
          </Tooltip>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
            <span className="text-sm text-muted-foreground">
              {selectedDisplayedCount > 0
                ? `${selectedDisplayedCount}건 선택`
                : "선택 없음"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isViewingSnapshot || selectedDisplayedCount === 0}
              className="gap-1"
              onClick={deleteSelectedRows}
            >
              <Trash2 className="size-3.5" />
              선택 삭제
            </Button>

            <span className="hidden h-4 w-px bg-slate-300 sm:inline" />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={isViewingSnapshot}
              onClick={() => addRows(1)}
            >
              <Plus className="size-3.5" />
              행 1개 추가
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1"
              disabled={isViewingSnapshot}
              onClick={() => addRows(DEFAULT_ROW_BATCH)}
            >
              <Plus className="size-3.5" />
              행 {DEFAULT_ROW_BATCH}개 추가
            </Button>
          </div>
        </div>

        {viewingSnapshot ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="size-4" />
              '{viewingSnapshot.label}' 스냅샷을 읽기전용으로 보는 중입니다. 편집하려면 편집 버전으로 돌아가세요.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1 border-amber-300 bg-white"
              onClick={() => setViewingSnapshot(null)}
            >
              편집 버전으로 ({planVersion})
            </Button>
          </div>
        ) : null}

        <div
          ref={tableScrollRef}
          className="max-h-[60vh] overflow-auto overscroll-contain"
        >
        <DndContext
          sensors={dragSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleRowDragEnd}
        >
        <SortableContext
          items={displayedRows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
        <table className="min-w-[1620px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
            <tr className="bg-slate-50">
              <Th rowSpan={2} className="w-8" />
              <Th rowSpan={2} className="w-10">
                <Checkbox
                  checked={allDisplayedSelected}
                  onCheckedChange={toggleAllDisplayedSelection}
                  disabled={isViewingSnapshot}
                  aria-label="표시된 행 전체 선택"
                />
              </Th>
              <Th rowSpan={2} className="w-[180px]">
                <SortableHeader
                  label="세부사업명(세목)"
                  sort={subProjectSort}
                  onToggle={() => toggleSort("subProject", subProjectSort)}
                />
              </Th>
              <Th rowSpan={2} className="w-[180px]">
                <SortableHeader
                  label="상세분류(세세목)"
                  sort={detailCategorySort}
                  onToggle={() =>
                    toggleSort("detailCategory", detailCategorySort)
                  }
                />
              </Th>
              <Th rowSpan={2} className="w-[80px]">
                <SortableHeader
                  label="월"
                  sort={monthSort}
                  onToggle={() => toggleSort("month", monthSort)}
                />
              </Th>
              <Th colSpan={3}>계획</Th>
              <Th colSpan={3}>실적</Th>
              <Th rowSpan={2} className="w-[360px]">
                내용
              </Th>
            </tr>

            <tr className="bg-slate-50">
              <Th>인원(명)</Th>
              <Th>횟수(회)</Th>
              <Th>원천 / 예산(원)</Th>
              <Th>인원(명)</Th>
              <Th>횟수(회)</Th>
              <Th>원천 / 지출(원)</Th>
            </tr>

            <tr className="bg-white font-bold">
              <Td />
              <Td />
              <Td colSpan={3} center>
                총계
              </Td>
              <Td right>{totals.planPeople.toLocaleString()}</Td>
              <Td right>{totals.planCount.toLocaleString()}</Td>
              <Td right>{totals.planBudget.toLocaleString()}원</Td>
              <Td right>{totals.actualPeople.toLocaleString()}</Td>
              <Td right>{totals.actualCount.toLocaleString()}</Td>
              <Td right>{totals.actualExpense.toLocaleString()}원</Td>
              <Td />
            </tr>
          </thead>

          <InputManagementExcelGrid
            rows={displayedRows}
            onRowsChange={mergeDisplayedRows}
            onOpenActualModal={openActualModal}
            onRowSelect={handleRowSelect}
            hasRowSelection={selectedDisplayedCount > 0}
            readOnly={isViewingSnapshot}
            enableRowReorder={!isRowOrderLocked && !isViewingSnapshot}
            subProjectSuggestions={subProjectSuggestions}
            detailCategorySuggestions={detailCategorySuggestions}
          />
        </table>
        </SortableContext>
        </DndContext>
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-[200] w-56 rounded border border-slate-300 bg-white p-2 shadow-xl"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100"
            onClick={() => {
              setShowTaskModal(true)
              setContextMenu(null)
            }}
          >
            <Plus size={15} />
            세부사업명(세목) 추가
          </button>

          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100"
            onClick={() => {
              setShowDetailModal(true)
              setContextMenu(null)
            }}
          >
            <Plus size={15} />
            상세분류(세세목) 추가
          </button>

          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100"
            onClick={() => addRows(1)}
          >
            <Plus size={15} />
            행 추가
          </button>
        </div>
      )}

      <Dialog open={showActualModal} onOpenChange={setShowActualModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>실적 입력</DialogTitle>
          </DialogHeader>

          {actualModalRow ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <label className="text-sm">
                  인원(명)
                  <input
                    type="number"
                    className="mt-1 h-9 w-full rounded border px-2"
                    value={actualModalRow.actualPeople}
                    onChange={(event) =>
                      updateRow(
                        actualModalRow.id,
                        "actualPeople",
                        Number(event.target.value) || 0
                      )
                    }
                  />
                </label>
                <label className="text-sm">
                  횟수(회)
                  <input
                    type="number"
                    className="mt-1 h-9 w-full rounded border px-2"
                    value={actualModalRow.actualCount}
                    onChange={(event) =>
                      updateRow(
                        actualModalRow.id,
                        "actualCount",
                        Number(event.target.value) || 0
                      )
                    }
                  />
                </label>
                <label className="text-sm">
                  지출(원)
                  <input
                    type="number"
                    className="mt-1 h-9 w-full rounded border px-2"
                    value={actualModalRow.actualExpense}
                    onChange={(event) =>
                      updateRow(
                        actualModalRow.id,
                        "actualExpense",
                        Number(event.target.value) || 0
                      )
                    }
                  />
                </label>
              </div>

              <label className="block text-sm">
                진행내역
                <textarea
                  className="mt-1 min-h-[100px] w-full rounded border px-2 py-2"
                  value={actualModalRow.content}
                  onChange={(event) =>
                    updateRow(actualModalRow.id, "content", event.target.value)
                  }
                />
              </label>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" onClick={() => setShowActualModal(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showDetailModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/20">
          <div className="w-[520px] rounded bg-white p-6 shadow-2xl">
            <div className="mb-2 text-center text-xl font-bold">
              상세분류(세세목) 추가
            </div>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              자주 쓰는 세세목을 등록하면 표 입력 시 자동완성으로 선택할 수 있습니다.
            </p>

            <div className="space-y-3">
              {detailCategoryItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <input
                    value={item.label}
                    onChange={(event) =>
                      setDetailCategoryItems((prev) =>
                        prev.map((v) =>
                          v.id === item.id
                            ? { ...v, label: event.target.value }
                            : v,
                        ),
                      )
                    }
                    placeholder="예: 웹매거진, SNS게시"
                    className="h-9 flex-1 rounded border border-slate-300 px-3"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setDetailCategoryItems((prev) =>
                        prev.filter((v) => v.id !== item.id),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="mt-4 rounded border border-sky-300 px-3 py-1 text-sm text-sky-600"
              onClick={() =>
                setDetailCategoryItems((prev) => [
                  ...prev,
                  { id: Date.now(), label: "" },
                ])
              }
            >
              다른 항목 추가
            </button>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                className="rounded bg-sky-500 px-10 py-3 text-white"
                onClick={() => setShowDetailModal(false)}
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/20">
          <div className="w-[520px] rounded bg-white p-6 shadow-2xl">
            <div className="mb-6 text-center text-xl font-bold">
              세부사업명 추가
            </div>

            <div className="space-y-3">
              {projectItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-xl">＝</span>

                  <Circle
                    size={18}
                    color={item.color}
                    fill={item.color}
                  />

                  <input
                    value={item.label}
                    onChange={(event) =>
                      setProjectItems((prev) =>
                        prev.map((v) =>
                          v.id === item.id
                            ? { ...v, label: event.target.value }
                            : v,
                        ),
                      )
                    }
                    className="h-9 flex-1 rounded border border-slate-300 px-3"
                  />

                  <button
                    onClick={() =>
                      setProjectItems((prev) =>
                        prev.filter((v) => v.id !== item.id),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              className="mt-4 rounded border border-sky-300 px-3 py-1 text-sm text-sky-600"
              onClick={() =>
                setProjectItems((prev) => [
                  ...prev,
                  {
                    id: Date.now(),
                    label: "",
                    color: "#d9d9d9",
                  },
                ])
              }
            >
              다른 항목 추가
            </button>

            <div className="mt-8 flex justify-center">
              <button
                className="rounded bg-sky-500 px-10 py-3 text-white"
                onClick={() => setShowTaskModal(false)}
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function SortableHeader({
  label,
  sort,
  onToggle,
}: {
  label: string
  sort: SortDirection
  onToggle: () => void
}) {
  const SortIcon =
    sort === "asc" ? ArrowUp : sort === "desc" ? ArrowDown : ArrowUpDown

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex w-full items-center justify-center gap-1 hover:text-primary"
    >
      {label}
      <SortIcon className="size-3.5 shrink-0 opacity-70" />
    </button>
  )
}

function Th({
  children,
  className = "",
  colSpan,
  rowSpan,
}: {
  children?: React.ReactNode
  className?: string
  colSpan?: number
  rowSpan?: number
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`border border-slate-300 px-3 py-3 text-center font-bold whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = "",
  center,
  right,
  colSpan,
  onClick,
}: {
  children?: React.ReactNode
  className?: string
  center?: boolean
  right?: boolean
  colSpan?: number
  onClick?: () => void
}) {
  return (
    <td
      colSpan={colSpan}
      onClick={onClick}
      className={`border border-slate-200 px-2 py-1 whitespace-nowrap ${
        center ? "text-center" : ""
      } ${right ? "text-right" : ""} ${className}`}
    >
      {children}
    </td>
  )
}

export default InputManagementTab