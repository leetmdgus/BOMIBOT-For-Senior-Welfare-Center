"use client"

import { useMemo, useRef, useState } from "react"
import type { PerformanceRow } from "@/services/kanban.performance.types"
import * as XLSX from "xlsx"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  HelpCircle,
  Plus,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { defaultDetailCategories } from "@/lib/mocks/kanban.performance-input.mock"

import { usePerformance } from "./performance-provider"
import { InputManagementExcelGrid } from "./input-management-excel-grid"

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

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

export function InputManagementTab() {
  const fileRef = useRef<HTMLInputElement | null>(null)

  const {
    rows,
    setRows,
    addSupplementaryBudget,
    planVersion,
  } = usePerformance()

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [viewAllMonths, setViewAllMonths] = useState(false)

  const [showLoadMenu, setShowLoadMenu] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showActualModal, setShowActualModal] = useState(false)
  const [actualModalRowId, setActualModalRowId] = useState<string | null>(null)

  const [subProjectSort, setSubProjectSort] = useState<"asc" | "desc" | null>(
    null
  )
  const [detailCategorySort, setDetailCategorySort] = useState<
    "asc" | "desc" | null
  >(null)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)

  const [projectItems, setProjectItems] = useState([
    { id: 1, label: "온라인홍보", color: "#8fd3ff" },
    { id: 2, label: "오프라인 홍보", color: "#ffe58f" },
    { id: 3, label: "관내 홍보", color: "#ff9c8f" },
  ])

  const [detailCategoryItems, setDetailCategoryItems] = useState(
    defaultDetailCategories.map((label, index) => ({
      id: index + 1,
      label,
    })),
  )

  const subProjects = useMemo(
    () => ["선택", ...projectItems.map((item) => item.label)],
    [projectItems],
  )

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
    if (viewAllMonths) return rows

    const monthLabel = `${selectedMonth}월`
    return rows.filter((row) => row.month === monthLabel)
  }, [rows, viewAllMonths, selectedMonth])

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

    return next
  }, [filteredRows, subProjectSort, detailCategorySort])

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
  }

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((row) => ({
        세부사업명: row.subProject,
        상세분류: row.detailCategory,
        월: row.month,
        계획인원: row.planPeople,
        계획횟수: row.planCount,
        계획예산: row.planBudget,
        실적인원: row.actualPeople,
        실적횟수: row.actualCount,
        실적지출: row.actualExpense,
        내용: row.content,
      })),
    )

    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "계획실적")
    XLSX.writeFile(book, "계획실적_입력관리.xlsx")
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

    const importedRows: RowData[] = json.map((item) => ({
      id: createId(),
      selected: false,
      subProject: String(item["세부사업명"] ?? "선택"),
      detailCategory: String(item["상세분류"] ?? "—"),
      month: String(item["월"] ?? "1월"),
      planPeople: Number(item["계획인원"] ?? 0),
      planCount: Number(item["계획횟수"] ?? 0),
      planBudget: Number(item["계획예산"] ?? 0),
      actualPeople: Number(item["실적인원"] ?? 0),
      actualCount: Number(item["실적횟수"] ?? 0),
      actualExpense: Number(item["실적지출"] ?? 0),
      content: String(item["내용"] ?? ""),
    }))

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
    setShowLoadMenu(false)
  }

  const openActualModal = (rowId: string) => {
    setActualModalRowId(rowId)
    setShowActualModal(true)
  }

  const toggleSort = (
    column: "subProject" | "detailCategory",
    current: "asc" | "desc" | null
  ) => {
    const next =
      current === null ? "asc" : current === "asc" ? "desc" : null

    if (column === "subProject") {
      setSubProjectSort(next)
      setDetailCategorySort(null)
      return
    }

    setDetailCategorySort(next)
    setSubProjectSort(null)
  }

  const goPrevMonth = () => {
    setViewAllMonths(false)
    setSelectedMonth((prev) => (prev <= 1 ? 12 : prev - 1))
  }

  const goNextMonth = () => {
    setViewAllMonths(false)
    setSelectedMonth((prev) => (prev >= 12 ? 1 : prev + 1))
  }

  const mergeDisplayedRows = (nextDisplayed: RowData[]) => {
    const byId = new Map(nextDisplayed.map((row) => [row.id, row]))

    setRows((prev) =>
      prev.map((row) => (byId.has(row.id) ? (byId.get(row.id) as RowData) : row)),
    )
  }

  return (
    <div
      className="relative min-h-screen bg-white p-8 text-slate-900"
      onClick={() => {
        setContextMenu(null)
        setShowLoadMenu(false)
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

      <div className="print-hide mb-10 flex items-start justify-between">
        <div className="flex items-start gap-2">
          <h1 className="text-3xl font-bold">계획/실적 입력관리</h1>

          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="mt-1 text-muted-foreground">
                <HelpCircle size={20} />
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
                범위 선택(Shift+클릭), 셀 모서리 드래그로 채우기가 지원됩니다.
              </p>
              <p>
                기존 파일을 업로드할 수 있으며, 이미 저장된 행 아래에 파일의
                행이 추가됩니다. 엑셀 양식의 「상세분류」 열에 세세목을 적어 업로드할 수 있습니다.
              </p>
              <p>실적 칸은 더블클릭하면 진행내역 입력 창이 열립니다.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="relative flex items-start gap-4">
          <div className="relative">
            <TopButton
              onClick={(event) => {
                event.stopPropagation()
                setShowLoadMenu((prev) => !prev)
              }}
            >
              불러오기
              <ChevronDown size={16} />
              <span className="text-xs text-muted-foreground">(NAS)</span>
            </TopButton>

            {showLoadMenu ? (
              <div
                className="absolute right-0 top-12 z-50 w-52 rounded border border-slate-300 bg-white p-1 shadow-lg"
                onClick={(event) => event.stopPropagation()}
              >
                {NAS_SEARCH_FIELDS.map((field) => (
                  <button
                    key={field}
                    type="button"
                    className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
                    onClick={() => loadFromNas(field)}
                  >
                    {field}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <TopButton onClick={() => fileRef.current?.click()}>
            업로드
            <span className="text-xs text-muted-foreground">(디바이스)</span>
          </TopButton>

          <TopButton onClick={exportExcel}>다운로드</TopButton>
        </div>
      </div>

      <div className="print-hide mb-4 flex flex-wrap items-center gap-2">
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
          disabled={viewAllMonths}
          onChange={(event) => {
            setViewAllMonths(false)
            setSelectedMonth(Number(event.target.value))
          }}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm disabled:opacity-50"
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
          onClick={() => setViewAllMonths(true)}
        >
          전체
        </Button>

        <Button type="button" variant="outline" size="icon" onClick={goPrevMonth}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={goNextMonth}>
          <ChevronRight className="size-4" />
        </Button>

        <span className="text-sm text-muted-foreground">
          {viewAllMonths
            ? `${selectedYear}년 전체`
            : `${selectedYear}년 ${selectedMonth}월`}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowTaskModal(true)}
        >
          세목 추가
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowDetailModal(true)}
        >
          세세목 추가
        </Button>
      </div>

      <div className="relative overflow-auto rounded-lg border-4 border-sky-500">
        <div className="print-hide sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span className="mr-auto text-xs text-muted-foreground">
            적용 추경: {planVersion}
            <span className="ml-2 hidden sm:inline">
              · 세세목은 「상세분류」 열 · Tab/Enter 이동 · Ctrl+C/V · 셀 모서리 채우기
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={addSupplementaryBudget}
          >
            <Plus className="size-3.5" />
            추경 추가
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground">
                <HelpCircle className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-sm">
              사업실적·사업결과에는 최신 추경이 적용됩니다.
            </TooltipContent>
          </Tooltip>
        </div>
        <table className="min-w-[1580px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
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
                월
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
            subProjectSuggestions={subProjects.filter((item) => item !== "선택")}
            detailCategorySuggestions={detailCategorySuggestions}
          />
        </table>
      </div>

      <button
        type="button"
        onClick={() => addRows(DEFAULT_ROW_BATCH)}
        className="mt-6 text-sm text-primary underline-offset-4 hover:underline"
      >
        하단 {DEFAULT_ROW_BATCH}개(기본값) 행 추가
      </button>

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

      <div className="print-hide fixed bottom-0 left-0 right-0 flex justify-center gap-4 border-t bg-white p-4">
        <button
          onClick={exportExcel}
          className="rounded bg-sky-500 px-8 py-2 text-white"
        >
          저장
        </button>
      </div>
    </div>
  )
}

function SortableHeader({
  label,
  sort,
  onToggle,
}: {
  label: string
  sort: "asc" | "desc" | null
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

function TopButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 items-center gap-2 rounded bg-slate-100 px-5 text-lg font-medium hover:bg-slate-200"
    >
      {children}
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