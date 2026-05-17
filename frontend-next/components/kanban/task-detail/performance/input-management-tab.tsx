"use client"

import { useMemo, useRef, useState } from "react"
import * as XLSX from "xlsx"
import {
  ChevronDown,
  Circle,
  HelpCircle,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"

type RowData = {
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

type CellKey = keyof RowData

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

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

const initialRows: RowData[] = [
  ["선택", "4월", 0, 0, 0, 199, 24, 898100],
  ["온라인홍보", "1월", 0, 1, 0, 0, 1, 0],
  ["온라인홍보", "1월", 3000, 1, 50000, 3481, 1, 50000],
  ["온라인홍보", "2월", 0, 1, 0, 0, 1, 0],
  ["온라인홍보", "2월", 3000, 1, 50000, 3396, 1, 50000],
  ["온라인홍보", "3월", 0, 1, 0, 0, 1, 0],
  ["온라인홍보", "3월", 3000, 1, 50000, 3457, 1, 50000],
].map((item, index) => ({
  id: createId(),
  selected: false,
  subProject: item[0] as string,
  detailCategory: "—",
  month: item[1] as string,
  planPeople: item[2] as number,
  planCount: item[3] as number,
  planBudget: item[4] as number,
  actualPeople: item[5] as number,
  actualCount: item[6] as number,
  actualExpense: item[7] as number,
  content:
    index % 2 === 0
      ? "웹매거진 제작 및 발송"
      : "온라인 게시물 관리대장",
}))

export function InputManagementTab() {
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [rows, setRows] = useState<RowData[]>(initialRows)
  const [showHelp, setShowHelp] = useState(false)
  const [showLoadMenu, setShowLoadMenu] = useState(false)
  const [showSearchMenu, setShowSearchMenu] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string
    key: CellKey
  } | null>(null)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)

  const [projectItems, setProjectItems] = useState([
    { id: 1, label: "온라인홍보", color: "#8fd3ff" },
    { id: 2, label: "오프라인 홍보", color: "#ffe58f" },
    { id: 3, label: "관내 홍보", color: "#ff9c8f" },
  ])

  const subProjects = useMemo(
    () => ["선택", ...projectItems.map((item) => item.label)],
    [projectItems],
  )

  const totals = useMemo(() => {
    return rows.reduce(
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
  }, [rows])

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

  const addRows = (count = 100) => {
    const nextRows: RowData[] = Array.from({ length: count }).map(() => ({
      id: createId(),
      selected: false,
      subProject: "선택",
      detailCategory: "—",
      month: "1월",
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

  const downloadTemplate = () => {
    const sheet = XLSX.utils.json_to_sheet([
      {
        세부사업명: "온라인홍보",
        상세분류: "—",
        월: "1월",
        계획인원: 0,
        계획횟수: 1,
        계획예산: 50000,
        실적인원: 0,
        실적횟수: 1,
        실적지출: 50000,
        내용: "온라인 게시물 관리대장",
      },
    ])

    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "양식")
    XLSX.writeFile(book, "계획실적_입력양식.xlsx")
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

  const handlePaste = (
    event: React.ClipboardEvent<HTMLInputElement>,
    rowId: string,
    key: CellKey,
  ) => {
    const text = event.clipboardData.getData("text")
    if (!text.includes("\t") && !text.includes("\n")) return

    event.preventDefault()

    const rowIndex = rows.findIndex((row) => row.id === rowId)
    const keys: CellKey[] = [
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

    const colIndex = keys.indexOf(key)
    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split("\t"))

    setRows((prev) => {
      const next = [...prev]

      lines.forEach((cols, r) => {
        if (!next[rowIndex + r]) return

        cols.forEach((value, c) => {
          const targetKey = keys[colIndex + c]
          if (!targetKey) return

          const numericKeys: CellKey[] = [
            "planPeople",
            "planCount",
            "planBudget",
            "actualPeople",
            "actualCount",
            "actualExpense",
          ]

          next[rowIndex + r] = {
            ...next[rowIndex + r],
            [targetKey]: numericKeys.includes(targetKey)
              ? Number(value.replaceAll(",", "")) || 0
              : value,
          }
        })
      })

      return next
    })
  }

  return (
    <div
      className="relative min-h-screen bg-white p-8 text-slate-900"
      onClick={() => {
        setContextMenu(null)
        setShowLoadMenu(false)
        setShowSearchMenu(false)
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

      <div className="mb-10 flex items-start justify-between">
        <div className="flex items-start gap-2">
          <h1 className="text-3xl font-bold">계획/실적 입력관리</h1>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setShowHelp(true)
            }}
            className="mt-1 text-slate-800"
          >
            <HelpCircle size={20} />
          </button>

          {showHelp && (
            <div className="absolute left-[300px] top-10 z-50 w-[720px] rounded border border-slate-300 bg-white p-4 text-lg leading-8 shadow-lg">
              <div className="flex justify-between">
                <div>
                  <b>계획/실적 입력관리</b>
                  <br />
                  세목·세세목·월을 선택하고 인원·횟수·예산을 입력합니다.
                  <br />
                  기존 파일을 업로드할 수 있으며, 이미 저장된 행 아래에
                  파일의 행이 추가됩니다.
                  <br />
                  사업실적은 실적 칸을 클릭해 진행내역을 입력합니다.
                </div>

                <button onClick={() => setShowHelp(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
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
              <ChevronDown size={20} />
            </TopButton>

            {showLoadMenu && (
              <div
                className="absolute right-0 top-12 z-50 w-48 rounded border border-slate-300 bg-white p-2 shadow-lg"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="block w-full px-3 py-2 text-left hover:bg-slate-100"
                  onClick={() => fileRef.current?.click()}
                >
                  엑셀 불러오기
                </button>

                <button
                  className="block w-full px-3 py-2 text-left hover:bg-slate-100"
                  onClick={downloadTemplate}
                >
                  양식 다운로드
                </button>

                <button
                  className="block w-full px-3 py-2 text-left hover:bg-slate-100"
                  onClick={exportExcel}
                >
                  현재 자료 다운로드
                </button>
              </div>
            )}
          </div>

          <TopButton onClick={() => fileRef.current?.click()}>
            업로드
          </TopButton>

          <TopButton onClick={exportExcel}>다운로드</TopButton>

          <div className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setShowSearchMenu((prev) => !prev)
              }}
              className="mt-12 w-40 bg-slate-300 px-4 py-2 text-center"
            >
              검색 필드
            </button>

            {showSearchMenu && (
              <div
                className="absolute right-0 top-20 z-50 w-48 rounded border border-slate-300 bg-white p-3 shadow-lg"
                onClick={(event) => event.stopPropagation()}
              >
                {[
                  "검색 필드",
                  "검색 필드",
                  "검색 필드",
                  "검색 필드",
                  "검색 필드",
                ].map((item, index) => (
                  <button
                    key={index}
                    className="block w-full px-3 py-1 text-left hover:bg-slate-100"
                  >
                    {index < 2 ? "∨ " : ""}
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-auto border-4 border-sky-500">
        <table className="min-w-[1450px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <Th rowSpan={2} className="w-[180px]">
                세부사업명(세목) ∨
              </Th>
              <Th rowSpan={2} className="w-[180px]">
                상세분류(세세목) ∨
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

          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="hover:bg-sky-50">
                <Td>
                  <div className="relative">
                    <select
                      value={row.subProject}
                      onChange={(event) =>
                        updateRow(row.id, "subProject", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2"
                    >
                      {subProjects.map((project) => (
                        <option key={project}>{project}</option>
                      ))}
                    </select>

                    {index === 5 && (
                      <div className="absolute left-0 top-9 z-30 w-44 rounded border border-slate-300 bg-white p-3 shadow-xl">
                        {projectItems.map((item) => (
                          <div key={item.id} className="py-2 text-sm">
                            {item.label}
                          </div>
                        ))}

                        <button
                          className="mt-2 text-sky-600"
                          onClick={() => setShowTaskModal(true)}
                        >
                          편집
                        </button>
                      </div>
                    )}
                  </div>
                </Td>

                <Td>
                  <select
                    value={row.detailCategory}
                    onChange={(event) =>
                      updateRow(row.id, "detailCategory", event.target.value)
                    }
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2"
                  >
                    <option>—</option>
                  </select>
                </Td>

                <Td>
                  <select
                    value={row.month}
                    onChange={(event) =>
                      updateRow(row.id, "month", event.target.value)
                    }
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2"
                  >
                    {months.map((month) => (
                      <option key={month}>{month}</option>
                    ))}
                  </select>
                </Td>

                <NumberCell
                  row={row}
                  column="planPeople"
                  selectedCell={selectedCell}
                  setSelectedCell={setSelectedCell}
                  onPaste={handlePaste}
                  onChange={(value) =>
                    updateRow(row.id, "planPeople", value)
                  }
                />

                <NumberCell
                  row={row}
                  column="planCount"
                  selectedCell={selectedCell}
                  setSelectedCell={setSelectedCell}
                  onPaste={handlePaste}
                  onChange={(value) =>
                    updateRow(row.id, "planCount", value)
                  }
                />

                <NumberCell
                  row={row}
                  column="planBudget"
                  selectedCell={selectedCell}
                  setSelectedCell={setSelectedCell}
                  onPaste={handlePaste}
                  onChange={(value) =>
                    updateRow(row.id, "planBudget", value)
                  }
                />

                <Td right className="text-indigo-700">
                  {row.actualPeople.toLocaleString()}
                </Td>

                <Td right className="text-indigo-700">
                  {row.actualCount.toLocaleString()}
                </Td>

                <Td right>
                  {row.actualExpense > 0 && (
                    <span className="mr-2 rounded bg-sky-500 px-1 text-xs text-white">
                      경
                    </span>
                  )}
                  {row.actualExpense.toLocaleString()}원
                </Td>

                <Td>
                  <input
                    value={row.content}
                    onPaste={(event) =>
                      handlePaste(event, row.id, "content")
                    }
                    onChange={(event) =>
                      updateRow(row.id, "content", event.target.value)
                    }
                    className="h-8 w-full rounded border border-slate-300 px-2"
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={() => addRows(100)} className="mt-24 text-lg">
        하단 100개(기본값) 행 추가
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
            세부사업명 추가
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

      <div className="fixed bottom-0 left-0 right-0 flex justify-center gap-4 border-t bg-white p-4">
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

function NumberCell({
  row,
  column,
  selectedCell,
  setSelectedCell,
  onPaste,
  onChange,
}: {
  row: RowData
  column: CellKey
  selectedCell: { rowId: string; key: CellKey } | null
  setSelectedCell: React.Dispatch<
    React.SetStateAction<{ rowId: string; key: CellKey } | null>
  >
  onPaste: (
    event: React.ClipboardEvent<HTMLInputElement>,
    rowId: string,
    key: CellKey,
  ) => void
  onChange: (value: number) => void
}) {
  const selected =
    selectedCell?.rowId === row.id && selectedCell.key === column

  return (
    <Td className={selected ? "ring-2 ring-sky-400 ring-inset" : ""}>
      <input
        type="number"
        value={Number(row[column]) || 0}
        onFocus={() =>
          setSelectedCell({
            rowId: row.id,
            key: column,
          })
        }
        onPaste={(event) => onPaste(event, row.id, column)}
        onChange={(event) =>
          onChange(Number(event.target.value.replaceAll(",", "")) || 0)
        }
        className="h-8 w-full rounded border border-slate-300 px-2 text-center"
      />
    </Td>
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
}: {
  children?: React.ReactNode
  className?: string
  center?: boolean
  right?: boolean
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border border-slate-200 px-2 py-1 whitespace-nowrap ${
        center ? "text-center" : ""
      } ${right ? "text-right" : ""} ${className}`}
    >
      {children}
    </td>
  )
}

export default InputManagementTab