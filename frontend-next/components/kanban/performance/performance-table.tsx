"use client"

import { useState, useRef, useCallback, useMemo, memo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  FileSpreadsheet,
  Check,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getPerformanceRows } from "@/services/kanban.performance.service"
import type { PerformanceRow as RowData } from "@/services/kanban.performance.types"

type CellKey = keyof Omit<RowData, "id" | "selected">

const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]

// 사업계획/실적/결과용 데이터 가공
function aggregateBySubProject(rows: RowData[]) {
  const grouped: Record<string, { 
    subProject: string
    planPeople: Record<string, number>
    planCount: Record<string, number>
    planBudget: Record<string, number>
    actualPeople: Record<string, number>
    actualCount: Record<string, number>
    actualExpense: Record<string, number>
  }> = {}
  
  rows.forEach(row => {
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
    grouped[row.subProject].planPeople[row.month] = (grouped[row.subProject].planPeople[row.month] || 0) + row.planPeople
    grouped[row.subProject].planCount[row.month] = (grouped[row.subProject].planCount[row.month] || 0) + row.planCount
    grouped[row.subProject].planBudget[row.month] = (grouped[row.subProject].planBudget[row.month] || 0) + row.planBudget
    grouped[row.subProject].actualPeople[row.month] = (grouped[row.subProject].actualPeople[row.month] || 0) + row.actualPeople
    grouped[row.subProject].actualCount[row.month] = (grouped[row.subProject].actualCount[row.month] || 0) + row.actualCount
    grouped[row.subProject].actualExpense[row.month] = (grouped[row.subProject].actualExpense[row.month] || 0) + row.actualExpense
  })
  
  return Object.values(grouped)
}

export const PerformanceTable = memo(function PerformanceTable() {
  const [rows, setRows] = useState<RowData[]>([])

  useEffect(() => {
    getPerformanceRows()
      .then((result) => setRows(result.data))
      .catch((error) => {
        console.error("실적 데이터 로드 실패:", error)
      })
  }, [])
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; column: CellKey } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSubTab, setActiveSubTab] = useState<"입력관리" | "사업계획" | "사업실적" | "사업결과">("입력관리")
  const [planVersion, setPlanVersion] = useState("기본계획")
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const aggregatedData = useMemo(() => aggregateBySubProject(rows), [rows])
  
  const totals = useMemo(() => rows.reduce(
    (acc, row) => ({
      planPeople: acc.planPeople + row.planPeople,
      planCount: acc.planCount + row.planCount,
      planBudget: acc.planBudget + row.planBudget,
      actualPeople: acc.actualPeople + row.actualPeople,
      actualCount: acc.actualCount + row.actualCount,
      actualExpense: acc.actualExpense + row.actualExpense,
    }),
    { planPeople: 0, planCount: 0, planBudget: 0, actualPeople: 0, actualCount: 0, actualExpense: 0 }
  ), [rows])

  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows])

  const handleCellClick = useCallback((rowId: string, column: CellKey) => {
    setSelectedCell({ rowId, column })
    const key = `${rowId}-${column}`
    setTimeout(() => {
      const input = inputRefs.current.get(key)
      if (input) {
        input.focus()
        input.select()
      }
    }, 0)
  }, [])

  const handleCellChange = useCallback((rowId: string, column: CellKey, value: string | number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [column]: value } : row
      )
    )
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIndex: number, colIndex: number, columns: CellKey[]) => {
      const row = rows[rowIndex]
      if (!row) return

      let newRowIndex = rowIndex
      let newColIndex = colIndex

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          newRowIndex = Math.max(0, rowIndex - 1)
          break
        case "ArrowDown":
        case "Enter":
          e.preventDefault()
          newRowIndex = Math.min(rows.length - 1, rowIndex + 1)
          break
        case "ArrowLeft":
          e.preventDefault()
          newColIndex = Math.max(0, colIndex - 1)
          break
        case "ArrowRight":
        case "Tab":
          e.preventDefault()
          newColIndex = Math.min(columns.length - 1, colIndex + 1)
          if (newColIndex === colIndex && e.key === "Tab") {
            newRowIndex = Math.min(rows.length - 1, rowIndex + 1)
            newColIndex = 0
          }
          break
        default:
          return
      }

      const newRow = rows[newRowIndex]
      if (newRow) {
        handleCellClick(newRow.id, columns[newColIndex])
      }
    },
    [rows, handleCellClick]
  )

  const toggleRowSelection = (rowId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, selected: !row.selected } : row
      )
    )
  }

  const toggleAllSelection = () => {
    const allSelected = rows.every((r) => r.selected)
    setRows((prev) => prev.map((row) => ({ ...row, selected: !allSelected })))
  }

  const deleteSelectedRows = () => {
    setRows((prev) => prev.filter((row) => !row.selected))
  }

  const copySelectedRows = () => {
    const selectedRows = rows.filter((r) => r.selected)
    const newRows = selectedRows.map((row, i) => ({
      ...row,
      id: `copy-${Date.now()}-${i}`,
      selected: false,
    }))
    setRows((prev) => [...prev, ...newRows])
  }

  const addRow = () => {
    const newRow: RowData = {
      id: `new-${Date.now()}`,
      selected: false,
      subProject: "신규회원 이용상담",
      detailCategory: "--",
      month: "1월",
      planPeople: 80,
      planCount: 80,
      planBudget: 0,
      actualPeople: 0,
      actualCount: 0,
      actualExpense: 0,
      content: "",
    }
    setRows((prev) => [...prev, newRow])
  }

  const columns: CellKey[] = ["subProject", "detailCategory", "month", "planPeople", "planCount", "planBudget", "actualPeople", "actualCount", "content"]

  const subTabs = ["계획/실적 입력관리", "사업계획", "사업실적", "사업결과"] as const
  const subTabKeys = ["입력관리", "사업계획", "사업실적", "사업결과"] as const

  // 진행률 계산
  const getProgressRate = (plan: number, actual: number) => {
    if (plan === 0) return "-"
    const rate = Math.round((actual / plan) * 100)
    return `${rate}%`
  }

  const getProgressColor = (plan: number, actual: number) => {
    if (plan === 0) return "text-muted-foreground"
    const rate = (actual / plan) * 100
    if (rate >= 100) return "text-green-600"
    if (rate >= 80) return "text-amber-600"
    return "text-red-500"
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">사업실적관리</h1>
        <p className="text-lg">2026년 · 일반상담 및 정보제공사업</p>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="세부사업명 또는 상세분류 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox />
          메모 포함
        </label>
        <span className="text-sm">월</span>
        <Select defaultValue="전체">
          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="전체">전체</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm">원천</span>
        <Select defaultValue="전체">
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="전체">전체</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm">세부사업명</span>
        <Select defaultValue="전체">
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="전체">전체</SelectItem>
            <SelectItem value="신규회원 이용상담">신규회원 이용상담</SelectItem>
            <SelectItem value="신규회원 가입">신규회원 가입</SelectItem>
            <SelectItem value="신규회원 교육">신규회원 교육</SelectItem>
            <SelectItem value="정보제공상담">정보제공상담</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Badges */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm">백업:</span>
        <Badge variant="outline">전체 22건</Badge>
        <Badge variant="outline" className="border-amber-400 text-amber-600">자동 0건</Badge>
        <Badge variant="outline" className="border-green-400 text-green-600">수동 10건</Badge>
        <Badge className="bg-blue-500">일별 10건</Badge>
        <Badge className="bg-blue-600">월별 2건</Badge>
      </div>

      {/* Sub Tabs */}
      <div className="mb-4 flex border-b border-border">
        {subTabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(subTabKeys[i])}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeSubTab === subTabKeys[i]
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeSubTab === "입력관리" && (
        <InputManagementTab
          rows={rows}
          setRows={setRows}
          selectedCell={selectedCell}
          handleCellClick={handleCellClick}
          handleCellChange={handleCellChange}
          handleKeyDown={handleKeyDown}
          toggleRowSelection={toggleRowSelection}
          toggleAllSelection={toggleAllSelection}
          deleteSelectedRows={deleteSelectedRows}
          copySelectedRows={copySelectedRows}
          addRow={addRow}
          selectedCount={selectedCount}
          totals={totals}
          columns={columns}
          inputRefs={inputRefs}
        />
      )}

      {activeSubTab === "사업계획" && (
        <PlanTab 
          aggregatedData={aggregatedData} 
          totals={totals} 
          planVersion={planVersion}
          setPlanVersion={setPlanVersion}
        />
      )}

      {activeSubTab === "사업실적" && (
        <ActualTab aggregatedData={aggregatedData} totals={totals} />
      )}

      {activeSubTab === "사업결과" && (
        <ResultTab 
          aggregatedData={aggregatedData} 
          totals={totals}
          getProgressRate={getProgressRate}
          getProgressColor={getProgressColor}
        />
      )}
    </div>
  )
})

// 입력관리 탭
function InputManagementTab({
  rows,
  selectedCell,
  handleCellClick,
  handleCellChange,
  handleKeyDown,
  toggleRowSelection,
  toggleAllSelection,
  deleteSelectedRows,
  copySelectedRows,
  addRow,
  selectedCount,
  totals,
  columns,
  inputRefs,
}: {
  rows: RowData[]
  setRows: React.Dispatch<React.SetStateAction<RowData[]>>
  selectedCell: { rowId: string; column: CellKey } | null
  handleCellClick: (rowId: string, column: CellKey) => void
  handleCellChange: (rowId: string, column: CellKey, value: string | number) => void
  handleKeyDown: (e: React.KeyboardEvent, rowIndex: number, colIndex: number, columns: CellKey[]) => void
  toggleRowSelection: (rowId: string) => void
  toggleAllSelection: () => void
  deleteSelectedRows: () => void
  copySelectedRows: () => void
  addRow: () => void
  selectedCount: number
  totals: { planPeople: number; planCount: number; planBudget: number; actualPeople: number; actualCount: number; actualExpense: number }
  columns: CellKey[]
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement>>
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Info Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">계획/실적 입력관리</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="mr-2 size-4" />
              세목·세세목 추가
            </Button>
            <Button variant="outline" size="sm">빈 행 정리</Button>
            <Select defaultValue="불러오기">
              <SelectTrigger className="w-28">
                <Download className="mr-2 size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="불러오기">불러오기</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="mr-2 size-4" />
              양식 다운로드
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="mr-2 size-4" />
              계획 업로드
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          행 추가 후 세목·세세목·월을 선택하고 인원·횟수·예산을 입력합니다. 계획은 양식 다운로드로 받은 CSV·엑셀(xlsx)을 편집한 뒤 계획 업로드할 수 있으며, 이미 저장된 계획 행은 그대로 두고 파일의 행이 추가됩니다. 사업실적은 실적 칸을 클릭해 진행내역을 입력합니다.
        </p>
        <div className="mt-3 flex items-center gap-4">
          <span className="text-sm">계획 버전</span>
          <Select defaultValue="기본계획">
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="기본계획">기본계획</SelectItem>
              <SelectItem value="추경1차">추경1차</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="text-primary">+ 추경 추가</Button>
          <span className="text-sm text-muted-foreground">(사업실적·사업결과에는 최신 추경이 적용됩니다.)</span>
        </div>
      </div>

      {/* Selection Actions */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-4 text-sm">
          <span>행 선택</span>
          <span className="text-muted-foreground">선택 없음</span>
          <Button variant="ghost" size="sm" onClick={deleteSelectedRows} disabled={selectedCount === 0}>
            <Trash2 className="mr-1 size-4" /> 선택 삭제
          </Button>
          <Button variant="ghost" size="sm" onClick={copySelectedRows} disabled={selectedCount === 0}>
            <Copy className="mr-1 size-4" /> 선택 복사
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-primary" onClick={addRow}>
            <Plus className="mr-1 size-4" /> 행 추가
          </Button>
          <Button variant="outline" size="sm">
            <Check className="mr-1 size-4" /> 계획 저장
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-card">
            <tr className="border-b border-border">
              <th className="w-10 px-2 py-3 text-center border-r border-border">
                <Checkbox
                  checked={rows.length > 0 && rows.every((r) => r.selected)}
                  onCheckedChange={toggleAllSelection}
                />
              </th>
              <th className="px-3 py-3 text-left font-medium border-r border-border" rowSpan={2}>세부사업명(세목)</th>
              <th className="px-3 py-3 text-left font-medium border-r border-border" rowSpan={2}>상세분류(세세목)</th>
              <th className="px-3 py-3 text-center font-medium border-r border-border" rowSpan={2}>월</th>
              <th className="px-3 py-3 text-center font-medium border-r border-border bg-blue-50" colSpan={3}>계획</th>
              <th className="px-3 py-3 text-center font-medium border-r border-border" colSpan={3}>실적</th>
              <th className="px-3 py-3 text-left font-medium border-r border-border" rowSpan={2}>내용</th>
              <th className="px-3 py-3 text-center font-medium" rowSpan={2}>관리</th>
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-10"></th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border bg-blue-50">인원(명)</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border bg-blue-50">횟수(회)</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border bg-blue-50">원천 / 예산(원)</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">인원(명)</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">횟수(회)</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">원천 / 지출(원)</th>
            </tr>
            {/* Totals Row */}
            <tr className="border-b border-border bg-muted/50 font-medium">
              <td className="px-2 py-2"></td>
              <td className="px-3 py-2 border-r border-border" colSpan={3}>총계</td>
              <td className="px-3 py-2 text-center border-r border-border bg-blue-50">{totals.planPeople.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border bg-blue-50">{totals.planCount.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border bg-blue-50">{totals.planBudget > 0 ? `${totals.planBudget.toLocaleString()}원` : ""}</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.actualPeople.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.actualCount.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.actualExpense > 0 ? `${totals.actualExpense.toLocaleString()}원` : "0원"}</td>
              <td className="border-r border-border"></td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id} className={cn("border-b border-border hover:bg-muted/30", row.selected && "bg-primary/5")}>
                <td className="px-2 py-2 text-center border-r border-border">
                  <Checkbox checked={row.selected} onCheckedChange={() => toggleRowSelection(row.id)} />
                </td>
                {/* SubProject Cell */}
                <td
                  className={cn(
                    "px-1 py-1 border-r border-border cursor-pointer",
                    selectedCell?.rowId === row.id && selectedCell?.column === "subProject" && "ring-2 ring-primary ring-inset"
                  )}
                  onClick={() => handleCellClick(row.id, "subProject")}
                >
                  <Select
                    value={row.subProject}
                    onValueChange={(v) => handleCellChange(row.id, "subProject", v)}
                  >
                    <SelectTrigger className="border-0 shadow-none h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="신규회원 이용상담">신규회원 이용상담</SelectItem>
                      <SelectItem value="신규회원 가입">신규회원 가입</SelectItem>
                      <SelectItem value="신규회원 교육">신규회원 교육</SelectItem>
                      <SelectItem value="정보제공상담">정보제공상담</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                {/* Detail Category */}
                <td
                  className={cn(
                    "px-1 py-1 border-r border-border cursor-pointer",
                    selectedCell?.rowId === row.id && selectedCell?.column === "detailCategory" && "ring-2 ring-primary ring-inset"
                  )}
                  onClick={() => handleCellClick(row.id, "detailCategory")}
                >
                  <Select
                    value={row.detailCategory}
                    onValueChange={(v) => handleCellChange(row.id, "detailCategory", v)}
                  >
                    <SelectTrigger className="border-0 shadow-none h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="--">--</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                {/* Month */}
                <td
                  className={cn(
                    "px-1 py-1 border-r border-border cursor-pointer",
                    selectedCell?.rowId === row.id && selectedCell?.column === "month" && "ring-2 ring-primary ring-inset"
                  )}
                  onClick={() => handleCellClick(row.id, "month")}
                >
                  <Select
                    value={row.month}
                    onValueChange={(v) => handleCellChange(row.id, "month", v)}
                  >
                    <SelectTrigger className="border-0 shadow-none h-8 w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                {/* Plan People */}
                <EditableCell
                  rowId={row.id}
                  column="planPeople"
                  value={row.planPeople}
                  selectedCell={selectedCell}
                  handleCellClick={handleCellClick}
                  handleCellChange={handleCellChange}
                  handleKeyDown={handleKeyDown}
                  rowIndex={rowIndex}
                  colIndex={3}
                  columns={columns}
                  inputRefs={inputRefs}
                  className="bg-blue-50/50"
                />
                {/* Plan Count */}
                <EditableCell
                  rowId={row.id}
                  column="planCount"
                  value={row.planCount}
                  selectedCell={selectedCell}
                  handleCellClick={handleCellClick}
                  handleCellChange={handleCellChange}
                  handleKeyDown={handleKeyDown}
                  rowIndex={rowIndex}
                  colIndex={4}
                  columns={columns}
                  inputRefs={inputRefs}
                  className="bg-blue-50/50"
                />
                {/* Plan Budget */}
                <td className="px-3 py-2 text-center text-sm border-r border-border bg-blue-50/50 text-primary cursor-pointer hover:underline">
                  클릭하여 원천 선택
                </td>
                {/* Actual People */}
                <EditableCell
                  rowId={row.id}
                  column="actualPeople"
                  value={row.actualPeople}
                  selectedCell={selectedCell}
                  handleCellClick={handleCellClick}
                  handleCellChange={handleCellChange}
                  handleKeyDown={handleKeyDown}
                  rowIndex={rowIndex}
                  colIndex={6}
                  columns={columns}
                  inputRefs={inputRefs}
                />
                {/* Actual Count */}
                <EditableCell
                  rowId={row.id}
                  column="actualCount"
                  value={row.actualCount}
                  selectedCell={selectedCell}
                  handleCellClick={handleCellClick}
                  handleCellChange={handleCellChange}
                  handleKeyDown={handleKeyDown}
                  rowIndex={rowIndex}
                  colIndex={7}
                  columns={columns}
                  inputRefs={inputRefs}
                />
                {/* Content */}
                <td
                  className={cn(
                    "px-2 py-1 border-r border-border cursor-pointer min-w-[200px]",
                    selectedCell?.rowId === row.id && selectedCell?.column === "content" && "ring-2 ring-primary ring-inset"
                  )}
                  onClick={() => handleCellClick(row.id, "content")}
                >
                  <input
                    ref={(el) => { if (el) inputRefs.current.set(`${row.id}-content`, el) }}
                    type="text"
                    value={row.content}
                    onChange={(e) => handleCellChange(row.id, "content", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, rowIndex, 8, columns)}
                    className="w-full bg-transparent border-0 outline-none text-sm"
                  />
                </td>
                {/* Actions */}
                <td className="px-2 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="size-7">
                      <FileSpreadsheet className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Editable Cell Component
function EditableCell({
  rowId,
  column,
  value,
  selectedCell,
  handleCellClick,
  handleCellChange,
  handleKeyDown,
  rowIndex,
  colIndex,
  columns,
  inputRefs,
  className,
}: {
  rowId: string
  column: CellKey
  value: number
  selectedCell: { rowId: string; column: CellKey } | null
  handleCellClick: (rowId: string, column: CellKey) => void
  handleCellChange: (rowId: string, column: CellKey, value: string | number) => void
  handleKeyDown: (e: React.KeyboardEvent, rowIndex: number, colIndex: number, columns: CellKey[]) => void
  rowIndex: number
  colIndex: number
  columns: CellKey[]
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement>>
  className?: string
}) {
  const isSelected = selectedCell?.rowId === rowId && selectedCell?.column === column

  return (
    <td
      className={cn(
        "px-2 py-1 text-center border-r border-border cursor-pointer",
        isSelected && "ring-2 ring-primary ring-inset",
        className
      )}
      onClick={() => handleCellClick(rowId, column)}
    >
      <input
        ref={(el) => { if (el) inputRefs.current.set(`${rowId}-${column}`, el) }}
        type="number"
        value={value}
        onChange={(e) => handleCellChange(rowId, column, parseInt(e.target.value) || 0)}
        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex, columns)}
        className="w-full bg-transparent border-0 outline-none text-center text-sm"
      />
    </td>
  )
}

// 사업계획 탭
function PlanTab({ 
  aggregatedData, 
  totals,
  planVersion,
  setPlanVersion,
}: { 
  aggregatedData: ReturnType<typeof aggregateBySubProject>
  totals: { planPeople: number; planCount: number; planBudget: number; actualPeople: number; actualCount: number; actualExpense: number }
  planVersion: string
  setPlanVersion: (v: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">월별 계획 보기</h2>
          <span className="text-sm text-muted-foreground">계획/실적 입력관리 탭에서 입력한 내용을 보여줍니다.</span>
          <span className="text-sm ml-4">계획 버전</span>
          <Select value={planVersion} onValueChange={setPlanVersion}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="기본계획">기본계획</SelectItem>
              <SelectItem value="추경1차">추경1차</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">(사업실적·사업결과에는 최신 추경이 적용됩니다.)</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-card">
            <tr className="border-b border-border">
              <th className="px-3 py-3 text-left font-medium border-r border-border" rowSpan={2}>세부사업명 · 상세분류</th>
              <th className="px-3 py-3 text-center font-medium border-r border-border" colSpan={3}>총계</th>
              {months.slice(0, 4).map((m, i) => (
                <th key={m} className={cn("px-3 py-3 text-center font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")} colSpan={3}>{m}</th>
              ))}
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">인원(명)</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">횟수(회)</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">예산(원)</th>
              {months.slice(0, 4).map((m, i) => (
                <React.Fragment key={m}>
                  <th className={cn("px-3 py-2 text-center text-xs font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")}>인원</th>
                  <th className={cn("px-3 py-2 text-center text-xs font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")}>횟수</th>
                  <th className={cn("px-3 py-2 text-center text-xs font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")}>예산(원)</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Totals */}
            <tr className="border-b border-border bg-muted/50 font-medium">
              <td className="px-3 py-2 border-r border-border">합계</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.planPeople.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.planCount.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.planBudget > 0 ? totals.planBudget.toLocaleString() : ""}</td>
              {months.slice(0, 4).map((m, i) => {
                const monthPlanPeople = aggregatedData.reduce((acc, d) => acc + (d.planPeople[m] || 0), 0)
                const monthPlanCount = aggregatedData.reduce((acc, d) => acc + (d.planCount[m] || 0), 0)
                return (
                  <React.Fragment key={m}>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{monthPlanPeople}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{monthPlanCount}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border text-primary", i % 2 === 0 && "bg-blue-50")}>0</td>
                  </React.Fragment>
                )
              })}
            </tr>
            {aggregatedData.map((item) => (
              <tr key={item.subProject} className="border-b border-border hover:bg-muted/30">
                <td className="px-3 py-2 border-r border-border border-l-4 border-l-primary">{item.subProject}</td>
                <td className="px-3 py-2 text-center border-r border-border">{Object.values(item.planPeople).reduce((a, b) => a + b, 0)}</td>
                <td className="px-3 py-2 text-center border-r border-border">{Object.values(item.planCount).reduce((a, b) => a + b, 0)}</td>
                <td className="px-3 py-2 text-center border-r border-border">0</td>
                {months.slice(0, 4).map((m, i) => (
                  <React.Fragment key={m}>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{item.planPeople[m] || 0}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{item.planCount[m] || 0}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border text-primary", i % 2 === 0 && "bg-blue-50")}>0</td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-border flex justify-center">
        <Button variant="outline">닫기</Button>
      </div>
    </div>
  )
}

// 사업실적 탭
function ActualTab({ aggregatedData, totals }: { 
  aggregatedData: ReturnType<typeof aggregateBySubProject>
  totals: { planPeople: number; planCount: number; planBudget: number; actualPeople: number; actualCount: number; actualExpense: number }
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">월별 실적 보기</h2>
          <span className="text-sm text-muted-foreground">계획/실적 입력관리 탭에서 입력한 내용을 보여줍니다.</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-card">
            <tr className="border-b border-border">
              <th className="px-3 py-3 text-left font-medium border-r border-border" rowSpan={2}>세부사업명 · 상세분류</th>
              <th className="px-3 py-3 text-center font-medium border-r border-border" colSpan={3}>총계</th>
              {months.slice(0, 4).map((m, i) => (
                <th key={m} className={cn("px-3 py-3 text-center font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")} colSpan={3}>{m}</th>
              ))}
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">인원(명)</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">횟수(회)</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">원천 / 지출(원)</th>
              {months.slice(0, 4).map((m, i) => (
                <React.Fragment key={m}>
                  <th className={cn("px-3 py-2 text-center text-xs font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")}>인원</th>
                  <th className={cn("px-3 py-2 text-center text-xs font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")}>횟수</th>
                  <th className={cn("px-3 py-2 text-center text-xs font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")}>원천 / 지출(원)</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border bg-muted/50 font-medium">
              <td className="px-3 py-2 border-r border-border">합계</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.actualPeople.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.actualCount.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border">0</td>
              {months.slice(0, 4).map((m, i) => {
                const monthActualPeople = aggregatedData.reduce((acc, d) => acc + (d.actualPeople[m] || 0), 0)
                const monthActualCount = aggregatedData.reduce((acc, d) => acc + (d.actualCount[m] || 0), 0)
                return (
                  <React.Fragment key={m}>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{monthActualPeople}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{monthActualCount}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border text-primary", i % 2 === 0 && "bg-blue-50")}>0</td>
                  </React.Fragment>
                )
              })}
            </tr>
            {aggregatedData.map((item) => (
              <tr key={item.subProject} className="border-b border-border hover:bg-muted/30">
                <td className="px-3 py-2 border-r border-border border-l-4 border-l-primary">{item.subProject}</td>
                <td className="px-3 py-2 text-center border-r border-border">{Object.values(item.actualPeople).reduce((a, b) => a + b, 0)}</td>
                <td className="px-3 py-2 text-center border-r border-border">{Object.values(item.actualCount).reduce((a, b) => a + b, 0)}</td>
                <td className="px-3 py-2 text-center border-r border-border">0</td>
                {months.slice(0, 4).map((m, i) => (
                  <React.Fragment key={m}>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{item.actualPeople[m] || 0}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{item.actualCount[m] || 0}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border text-primary", i % 2 === 0 && "bg-blue-50")}>0</td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// 사업결과 탭
function ResultTab({ 
  aggregatedData, 
  totals,
  getProgressRate,
  getProgressColor,
}: { 
  aggregatedData: ReturnType<typeof aggregateBySubProject>
  totals: { planPeople: number; planCount: number; planBudget: number; actualPeople: number; actualCount: number; actualExpense: number }
  getProgressRate: (plan: number, actual: number) => string
  getProgressColor: (plan: number, actual: number) => string
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">사업결과 (계획 대비 진행률)</h2>
          <span className="text-sm text-muted-foreground">계획 대비 실적 진행률 및 실적 미진/초과 사유·해결방안 입력</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-card">
            <tr className="border-b border-border">
              <th className="px-3 py-3 text-left font-medium border-r border-border" rowSpan={2}>세부사업명 · 상세분류</th>
              <th className="px-3 py-3 text-center font-medium border-r border-border" rowSpan={2}>구분</th>
              <th className="px-3 py-3 text-center font-medium border-r border-border" colSpan={3}>총계</th>
              {months.slice(0, 3).map((m, i) => (
                <th key={m} className={cn("px-3 py-3 text-center font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")} colSpan={3}>{m}</th>
              ))}
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">인원</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">횟수</th>
              <th className="px-3 py-2 text-center text-xs font-medium border-r border-border">예산(원)</th>
              {months.slice(0, 3).map((m, i) => (
                <React.Fragment key={m}>
                  <th className={cn("px-3 py-2 text-center text-xs font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")}>인원</th>
                  <th className={cn("px-3 py-2 text-center text-xs font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")}>횟수</th>
                  <th className={cn("px-3 py-2 text-center text-xs font-medium border-r border-border", i % 2 === 0 && "bg-blue-50")}>예산(원)</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Totals - 계획/실적/진행률 */}
            <tr className="border-b border-border bg-muted/50">
              <td className="px-3 py-2 border-r border-border font-medium" rowSpan={3}>합계</td>
              <td className="px-3 py-2 text-center border-r border-border text-xs">계획</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.planPeople.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.planCount.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border">15,000,000</td>
              {months.slice(0, 3).map((m, i) => {
                const monthPlanPeople = aggregatedData.reduce((acc, d) => acc + (d.planPeople[m] || 0), 0)
                const monthPlanCount = aggregatedData.reduce((acc, d) => acc + (d.planCount[m] || 0), 0)
                return (
                  <React.Fragment key={m}>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{monthPlanPeople}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{monthPlanCount}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>0</td>
                  </React.Fragment>
                )
              })}
            </tr>
            <tr className="border-b border-border bg-muted/50">
              <td className="px-3 py-2 text-center border-r border-border text-xs">실적</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.actualPeople.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border">{totals.actualCount.toLocaleString()}</td>
              <td className="px-3 py-2 text-center border-r border-border">0</td>
              {months.slice(0, 3).map((m, i) => {
                const monthActualPeople = aggregatedData.reduce((acc, d) => acc + (d.actualPeople[m] || 0), 0)
                const monthActualCount = aggregatedData.reduce((acc, d) => acc + (d.actualCount[m] || 0), 0)
                return (
                  <React.Fragment key={m}>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{monthActualPeople}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{monthActualCount}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>0</td>
                  </React.Fragment>
                )
              })}
            </tr>
            <tr className="border-b-2 border-border bg-muted/50">
              <td className="px-3 py-2 text-center border-r border-border text-xs">진행률</td>
              <td className={cn("px-3 py-2 text-center border-r border-border font-medium", getProgressColor(totals.planPeople, totals.actualPeople))}>{getProgressRate(totals.planPeople, totals.actualPeople)}</td>
              <td className={cn("px-3 py-2 text-center border-r border-border font-medium", getProgressColor(totals.planCount, totals.actualCount))}>{getProgressRate(totals.planCount, totals.actualCount)}</td>
              <td className="px-3 py-2 text-center border-r border-border">-</td>
              {months.slice(0, 3).map((m, i) => {
                const monthPlanPeople = aggregatedData.reduce((acc, d) => acc + (d.planPeople[m] || 0), 0)
                const monthPlanCount = aggregatedData.reduce((acc, d) => acc + (d.planCount[m] || 0), 0)
                const monthActualPeople = aggregatedData.reduce((acc, d) => acc + (d.actualPeople[m] || 0), 0)
                const monthActualCount = aggregatedData.reduce((acc, d) => acc + (d.actualCount[m] || 0), 0)
                return (
                  <React.Fragment key={m}>
                    <td className={cn("px-3 py-2 text-center border-r border-border font-medium", i % 2 === 0 && "bg-blue-50", getProgressColor(monthPlanPeople, monthActualPeople))}>{getProgressRate(monthPlanPeople, monthActualPeople)}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border font-medium", i % 2 === 0 && "bg-blue-50", getProgressColor(monthPlanCount, monthActualCount))}>{getProgressRate(monthPlanCount, monthActualCount)}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>-</td>
                  </React.Fragment>
                )
              })}
            </tr>

            {/* Individual items */}
            {aggregatedData.map((item) => {
              const totalPlanPeople = Object.values(item.planPeople).reduce((a, b) => a + b, 0)
              const totalPlanCount = Object.values(item.planCount).reduce((a, b) => a + b, 0)
              const totalActualPeople = Object.values(item.actualPeople).reduce((a, b) => a + b, 0)
              const totalActualCount = Object.values(item.actualCount).reduce((a, b) => a + b, 0)
              
              return (
                <React.Fragment key={item.subProject}>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 border-r border-border border-l-4 border-l-primary" rowSpan={3}>{item.subProject}</td>
                    <td className="px-3 py-2 text-center border-r border-border text-xs">계획</td>
                    <td className="px-3 py-2 text-center border-r border-border">{totalPlanPeople}</td>
                    <td className="px-3 py-2 text-center border-r border-border">{totalPlanCount}</td>
                    <td className="px-3 py-2 text-center border-r border-border">0</td>
                    {months.slice(0, 3).map((m, i) => (
                      <React.Fragment key={m}>
                        <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{item.planPeople[m] || 0}</td>
                        <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{item.planCount[m] || 0}</td>
                        <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>0</td>
                      </React.Fragment>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 text-center border-r border-border text-xs">실적</td>
                    <td className="px-3 py-2 text-center border-r border-border">{totalActualPeople}</td>
                    <td className="px-3 py-2 text-center border-r border-border">{totalActualCount}</td>
                    <td className="px-3 py-2 text-center border-r border-border">0</td>
                    {months.slice(0, 3).map((m, i) => (
                      <React.Fragment key={m}>
                        <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{item.actualPeople[m] || 0}</td>
                        <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>{item.actualCount[m] || 0}</td>
                        <td className={cn("px-3 py-2 text-center border-r border-border text-primary", i % 2 === 0 && "bg-blue-50")}>0</td>
                      </React.Fragment>
                    ))}
                  </tr>
                  <tr className="border-b-2 border-border">
                    <td className="px-3 py-2 text-center border-r border-border text-xs">진행률</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border font-medium", getProgressColor(totalPlanPeople, totalActualPeople))}>{getProgressRate(totalPlanPeople, totalActualPeople)}</td>
                    <td className={cn("px-3 py-2 text-center border-r border-border font-medium", getProgressColor(totalPlanCount, totalActualCount))}>{getProgressRate(totalPlanCount, totalActualCount)}</td>
                    <td className="px-3 py-2 text-center border-r border-border">-</td>
                    {months.slice(0, 3).map((m, i) => (
                      <React.Fragment key={m}>
                        <td className={cn("px-3 py-2 text-center border-r border-border font-medium", i % 2 === 0 && "bg-blue-50", getProgressColor(item.planPeople[m] || 0, item.actualPeople[m] || 0))}>{getProgressRate(item.planPeople[m] || 0, item.actualPeople[m] || 0)}</td>
                        <td className={cn("px-3 py-2 text-center border-r border-border font-medium", i % 2 === 0 && "bg-blue-50", getProgressColor(item.planCount[m] || 0, item.actualCount[m] || 0))}>{getProgressRate(item.planCount[m] || 0, item.actualCount[m] || 0)}</td>
                        <td className={cn("px-3 py-2 text-center border-r border-border", i % 2 === 0 && "bg-blue-50")}>-</td>
                      </React.Fragment>
                    ))}
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import React from "react"
