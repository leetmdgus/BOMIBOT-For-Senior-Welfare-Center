"use client"

import { Copy, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  CellKey,
  months,
  RowData,
  usePerformance,
} from "./performance-provider"

export function PlanTab() {
  const {
    rows,
    selectedCell,
    inputRefs,
    columns,
    totals,
    selectedCount,
    handleCellClick,
    handleCellChange,
    toggleRowSelection,
    toggleAllSelection,
    deleteSelectedRows,
    copySelectedRows,
    addRow,
  } = usePerformance()

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border">
        {/* <h2 className="text-lg font-semibold">사업계획</h2> */}

        <p className="mt-1 text-sm text-muted-foreground">
          사업계획 관리 화면입니다.
        </p>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3 text-sm">
          <span>행 선택</span>

          <span className="text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount}건 선택`
              : "선택 없음"}
          </span>

          <Button
            variant="ghost"
            size="sm"
            disabled={selectedCount === 0}
            onClick={deleteSelectedRows}
          >
            <Trash2 className="mr-1 size-4" />
            선택 삭제
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={selectedCount === 0}
            onClick={copySelectedRows}
          >
            <Copy className="mr-1 size-4" />
            선택 복사
          </Button>
        </div>

        <Button size="sm" onClick={addRow}>
          <Plus className="mr-1 size-4" />
          행 추가
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="w-10 px-2 py-3 text-center border-r border-border">
                <Checkbox
                  checked={
                    rows.length > 0 &&
                    rows.every(
                      (row: RowData) => row.selected
                    )
                  }
                  onCheckedChange={toggleAllSelection}
                />
              </th>

              <th className="px-3 py-3 text-left border-r border-border">
                세부사업명
              </th>

              <th className="px-3 py-3 text-left border-r border-border">
                상세분류
              </th>

              <th className="px-3 py-3 text-center border-r border-border">
                월
              </th>

              <th className="px-3 py-3 text-center border-r border-border bg-blue-50">
                계획 인원
              </th>

              <th className="px-3 py-3 text-center border-r border-border bg-blue-50">
                계획 횟수
              </th>

              <th className="px-3 py-3 text-center border-r border-border bg-blue-50">
                계획 예산
              </th>

              <th className="px-3 py-3 text-center border-r border-border">
                실적 인원
              </th>

              <th className="px-3 py-3 text-center border-r border-border">
                실적 횟수
              </th>

              <th className="px-3 py-3 text-center border-r border-border">
                실적 지출
              </th>

              <th className="px-3 py-3 text-left">
                내용
              </th>
            </tr>

            <tr className="border-b border-border bg-muted/50 font-medium">
              <td />

              <td
                className="px-3 py-2 border-r border-border"
                colSpan={3}
              >
                총계
              </td>

              <td className="px-3 py-2 text-center border-r border-border bg-blue-50">
                {totals.planPeople.toLocaleString()}
              </td>

              <td className="px-3 py-2 text-center border-r border-border bg-blue-50">
                {totals.planCount.toLocaleString()}
              </td>

              <td className="px-3 py-2 text-center border-r border-border bg-blue-50">
                {totals.planBudget.toLocaleString()}
              </td>

              <td className="px-3 py-2 text-center border-r border-border">
                {totals.actualPeople.toLocaleString()}
              </td>

              <td className="px-3 py-2 text-center border-r border-border">
                {totals.actualCount.toLocaleString()}
              </td>

              <td className="px-3 py-2 text-center border-r border-border">
                {totals.actualExpense.toLocaleString()}
              </td>

              <td />
            </tr>
          </thead>

          <tbody>
            {rows.map((row: RowData, rowIndex: number) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border hover:bg-muted/30",
                  row.selected && "bg-primary/5"
                )}
              >
                <td className="px-2 py-2 text-center border-r border-border">
                  <Checkbox
                    checked={row.selected}
                    onCheckedChange={() =>
                      toggleRowSelection(row.id)
                    }
                  />
                </td>

                <SelectCell
                  value={row.subProject}
                  rowId={row.id}
                  column="subProject"
                  options={[
                    "신규회원 이용상담",
                    "신규회원 가입",
                    "신규회원 교육",
                    "정보제공상담",
                  ]}
                />

                <SelectCell
                  value={row.detailCategory}
                  rowId={row.id}
                  column="detailCategory"
                  options={["--"]}
                />

                <SelectCell
                  value={row.month}
                  rowId={row.id}
                  column="month"
                  options={months}
                  className="w-24"
                />

                <EditableCell
                  row={row}
                  rowIndex={rowIndex}
                  column="planPeople"
                  className="bg-blue-50/50"
                />

                <EditableCell
                  row={row}
                  rowIndex={rowIndex}
                  column="planCount"
                  className="bg-blue-50/50"
                />

                <EditableCell
                  row={row}
                  rowIndex={rowIndex}
                  column="planBudget"
                  className="bg-blue-50/50"
                />

                <EditableCell
                  row={row}
                  rowIndex={rowIndex}
                  column="actualPeople"
                />

                <EditableCell
                  row={row}
                  rowIndex={rowIndex}
                  column="actualCount"
                />

                <EditableCell
                  row={row}
                  rowIndex={rowIndex}
                  column="actualExpense"
                />

                <td
                  className={cn(
                    "px-2 py-1 border-r border-border cursor-pointer min-w-[200px]",
                    selectedCell?.rowId === row.id &&
                      selectedCell?.column ===
                        "content" &&
                      "ring-2 ring-primary ring-inset"
                  )}
                  onClick={() =>
                    handleCellClick(row.id, "content")
                  }
                >
                  <input
                    ref={(el) => {
                      if (el)
                        inputRefs.current.set(
                          `${row.id}-content`,
                          el
                        )
                    }}
                    value={row.content}
                    onChange={(event) =>
                      handleCellChange(
                        row.id,
                        "content",
                        event.target.value
                      )
                    }
                    className="w-full bg-transparent border-0 outline-none text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  function SelectCell({
    value,
    rowId,
    column,
    options,
    className,
  }: {
    value: string
    rowId: string
    column: CellKey
    options: string[]
    className?: string
  }) {
    return (
      <td className="px-1 py-1 border-r border-border">
        <Select
          value={value}
          onValueChange={(nextValue) =>
            handleCellChange(
              rowId,
              column,
              nextValue
            )
          }
        >
          <SelectTrigger
            className={cn(
              "border-0 shadow-none h-8",
              className
            )}
          >
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option}
                value={option}
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
    )
  }

  function EditableCell({
    row,
    rowIndex,
    column,
    className,
  }: {
    row: RowData
    rowIndex: number
    column: CellKey
    className?: string
  }) {
    const selected =
      selectedCell?.rowId === row.id &&
      selectedCell?.column === column

    return (
      <td
        className={cn(
          "px-2 py-1 text-center border-r border-border cursor-pointer",
          selected &&
            "ring-2 ring-primary ring-inset",
          className
        )}
        onClick={() =>
          handleCellClick(row.id, column)
        }
      >
        <input
          ref={(el) => {
            if (el)
              inputRefs.current.set(
                `${row.id}-${column}`,
                el
              )
          }}
          type="number"
          value={Number(row[column]) || 0}
          onChange={(event) =>
            handleCellChange(
              row.id,
              column,
              Number(event.target.value) || 0
            )
          }
          className="w-full bg-transparent border-0 outline-none text-center text-sm"
        />
      </td>
    )
  }
}

export default PlanTab