"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"
import {
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Printer,
  Upload,
} from "lucide-react"

import { PrintArea } from "@/components/common/print-area"
import { EvaluationViewTogether } from "@/components/kanban/task-detail/evaluation-view-together"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  completeBusinessEvaluation,
  getBusinessEvaluation,
  getEvaluationFiles,
  getViewTogetherFixedFiles,
  saveBusinessEvaluation,
} from "@/services/kanban.task-detail.service"
import type {
  BusinessEvaluationData,
  EvaluationFile,
  EvaluationSection,
} from "@/services/kanban.task-detail.types"

const createId = () => crypto.randomUUID()

type SectionInsertPosition = "afterTemplate" | "end"

export function BusinessEvaluationTab() {
  const params = useParams<{ id: string }>()
  const taskId = params.id

  const [evaluationData, setEvaluationData] =
    useState<BusinessEvaluationData | null>(null)
  const [documentFiles, setDocumentFiles] = useState<EvaluationFile[]>([])
  const [fixedFiles] = useState(() => getViewTogetherFixedFiles())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const [isViewTogether, setIsViewTogether] = useState(false)
  const [isZoomView, setIsZoomView] = useState(false)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [searchField, setSearchField] = useState("all")
  const [filePage, setFilePage] = useState(1)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [scrollToSectionId, setScrollToSectionId] = useState<string | null>(
    null
  )
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const setSectionRef = useCallback(
    (sectionId: string) => (element: HTMLDivElement | null) => {
      if (element) {
        sectionRefs.current.set(sectionId, element)
      } else {
        sectionRefs.current.delete(sectionId)
      }
    },
    []
  )

  useEffect(() => {
    if (!scrollToSectionId) return

    const sectionId = scrollToSectionId
    const timer = window.setTimeout(() => {
      const element = sectionRefs.current.get(sectionId)
      element?.scrollIntoView({ behavior: "smooth", block: "center" })
      setScrollToSectionId(null)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [scrollToSectionId, evaluationData?.sections])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [evaluation, files] = await Promise.all([
        getBusinessEvaluation(taskId),
        getEvaluationFiles(taskId),
      ])
      setEvaluationData(evaluation)
      setDocumentFiles(files)
      setIsEditMode(!evaluation.isCompleted)
    } catch (error) {
      console.error("사업평가 데이터 로드 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    void load()
  }, [load])

  const persist = async (next: BusinessEvaluationData) => {
    setIsSaving(true)
    try {
      const saved = await saveBusinessEvaluation(taskId, {
        evaluationDate: next.evaluationDate,
        supervision: next.supervision,
        detailRows: next.detailRows,
        sections: next.sections,
        keyFactorAnalysis: next.keyFactorAnalysis,
        goalAppropriacy: next.goalAppropriacy,
        suggestion: next.suggestion,
      })
      setEvaluationData(saved)
    } catch (error) {
      console.error("사업평가 저장 실패:", error)
      alert("저장에 실패했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCompleteOrEdit = async () => {
    if (!evaluationData) return

    if (evaluationData.isCompleted) {
      setIsEditMode(true)
      return
    }

    setIsSaving(true)
    try {
      await persist(evaluationData)
      const completed = await completeBusinessEvaluation(taskId)
      setEvaluationData(completed)
      setIsEditMode(false)
      alert("사업평가가 완료되었습니다. 칸반 보드에 완료로 표시됩니다.")
    } catch (error) {
      console.error("사업평가 완료 실패:", error)
      alert("완료 처리에 실패했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleViewTogetherToggle = () => {
    if (!isViewTogether) {
      setIsViewTogether(true)
      setIsZoomView(false)
      setSelectedFileId(null)
      return
    }

    if (!isZoomView) {
      setIsZoomView(true)
      return
    }

    setIsZoomView(false)
    setIsViewTogether(false)
    setSelectedFileId(null)
  }

  const viewTogetherButtonLabel = !isViewTogether
    ? "함께보기"
    : isZoomView
      ? "함께보기"
      : "확대보기"

  const addSection = (
    type: EvaluationSection["type"],
    position: SectionInsertPosition
  ) => {
    if (!evaluationData) return

    const section: EvaluationSection = {
      id: createId(),
      type,
      title: type === "heading" ? "제목을 입력하세요" : "",
      content: type === "body" ? "" : "",
    }

    const sections =
      position === "afterTemplate"
        ? [section, ...evaluationData.sections]
        : [...evaluationData.sections, section]

    setEvaluationData({
      ...evaluationData,
      sections,
    })
    setScrollToSectionId(section.id)
  }

  const updateSection = (
    sectionId: string,
    patch: Partial<EvaluationSection>
  ) => {
    if (!evaluationData) return

    setEvaluationData({
      ...evaluationData,
      sections: evaluationData.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    })
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    if (!evaluationData) return

    const next = [...evaluationData.sections]
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return

    const movedSectionId = next[index].id
    ;[next[index], next[target]] = [next[target], next[index]]

    setEvaluationData({ ...evaluationData, sections: next })
    setScrollToSectionId(movedSectionId)
  }

  const deleteSection = (sectionId: string) => {
    if (!evaluationData) return

    setEvaluationData({
      ...evaluationData,
      sections: evaluationData.sections.filter(
        (section) => section.id !== sectionId
      ),
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">사업평가를 불러오는 중입니다.</p>
      </div>
    )
  }

  if (!evaluationData) {
    return (
      <p className="py-24 text-center text-sm text-muted-foreground">
        사업평가 데이터를 불러올 수 없습니다.
      </p>
    )
  }

  const evaluationDateValue = evaluationData.evaluationDate
    ? parseISO(evaluationData.evaluationDate)
    : undefined

  const canEdit = isEditMode && !isSaving

  return (
    <div className="space-y-6">
      <div className="print-hide flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="mr-2 size-4" />
          인쇄
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-w-[88px] bg-foreground text-background hover:bg-foreground/90"
          disabled={isSaving}
          onClick={() => void handleCompleteOrEdit()}
        >
          {evaluationData.isCompleted ? "수정" : "완료"}
        </Button>
      </div>

      <div className="print-hide flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={isViewTogether ? "default" : "outline"}
          size="sm"
          onClick={handleViewTogetherToggle}
        >
          {viewTogetherButtonLabel}
        </Button>
      </div>

      <PrintArea>
      {isViewTogether ? (
        <EvaluationViewTogether
          evaluation={evaluationData}
          fixedFiles={fixedFiles}
          documentFiles={documentFiles}
          selectedFileId={selectedFileId}
          onSelectFile={setSelectedFileId}
          onClearSelectedFile={() => setSelectedFileId(null)}
          searchField={searchField}
          onSearchFieldChange={setSearchField}
          filePage={filePage}
          onFilePageChange={setFilePage}
          isZoomView={isZoomView}
        />
      ) : null}

      {!isZoomView ? (
        <>
          <div id="evaluation-base-template" className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-6 text-center text-lg font-semibold">
              {evaluationData.programName} 최종사업평가서
            </h3>

            <table className="w-full border-collapse border border-gray-300 text-sm">
              <tbody>
                <tr>
                  <TableHeader>사업팀</TableHeader>
                  <TableCell>{evaluationData.team}</TableCell>
                  <TableHeader>담당자</TableHeader>
                  <TableCell>{evaluationData.manager}</TableCell>
                </tr>
                <tr>
                  <TableHeader>사업기간</TableHeader>
                  <TableCell>{evaluationData.period}</TableCell>
                  <TableHeader>평가일</TableHeader>
                  <TableCell>
                    <Popover
                      open={datePickerOpen}
                      onOpenChange={setDatePickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!canEdit}
                          className={cn(
                            "h-auto w-full justify-start px-0 font-normal",
                            !evaluationData.evaluationDate &&
                              "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {evaluationData.evaluationDate
                            ? format(
                                parseISO(evaluationData.evaluationDate),
                                "yyyy.MM.dd",
                                { locale: ko }
                              )
                            : "날짜 선택"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={evaluationDateValue}
                          onSelect={(date) => {
                            if (!date) return
                            setEvaluationData({
                              ...evaluationData,
                              evaluationDate: format(date, "yyyy-MM-dd"),
                            })
                            setDatePickerOpen(false)
                          }}
                          locale={ko}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </tr>
                <tr>
                  <TableHeader>프로그램명</TableHeader>
                  <TableCell>{evaluationData.programName}</TableCell>
                  <TableHeader>대상</TableHeader>
                  <TableCell>{evaluationData.target}</TableCell>
                </tr>
                <tr>
                  <TableHeader>계획</TableHeader>
                  <TableCell>
                    <span className="text-muted-foreground">인원(명/회)</span>{" "}
                    {evaluationData.planCount}
                  </TableCell>
                  <TableHeader>예산(원)</TableHeader>
                  <TableCell>{evaluationData.planBudget}</TableCell>
                </tr>
                <tr>
                  <TableHeader>실행</TableHeader>
                  <TableCell>
                    <span className="text-muted-foreground">인원(명/회)</span>{" "}
                    {evaluationData.actualCount}
                  </TableCell>
                  <TableHeader>지출(원)</TableHeader>
                  <TableCell>{evaluationData.actualExpense}</TableCell>
                </tr>
                <tr>
                  <TableHeader>목적</TableHeader>
                  <TableCell className="text-primary">
                    <ul className="list-disc pl-4">
                      <li>{evaluationData.purpose}</li>
                    </ul>
                  </TableCell>
                  <TableHeader>목표</TableHeader>
                  <TableCell className="text-primary">
                    <ul className="list-disc space-y-1 pl-4">
                      {evaluationData.goals.map((goal) => (
                        <li key={goal}>{goal}</li>
                      ))}
                    </ul>
                  </TableCell>
                </tr>
                <tr>
                  <TableHeader>성과지표</TableHeader>
                  <TableCell>{evaluationData.performanceIndicator}</TableCell>
                  <TableHeader>평가도구</TableHeader>
                  <TableCell>{evaluationData.evaluationTool}</TableCell>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="w-40 border border-gray-300 px-3 py-2 text-center">
                    항목
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center">
                    내용
                  </th>
                </tr>
              </thead>
              <tbody>
                {evaluationData.detailRows.map((row, index) => (
                  <tr key={row.label}>
                    <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium">
                      {row.label}
                    </th>
                    <td className="border border-gray-300 px-3 py-2">
                      {canEdit ? (
                        <Textarea
                          value={row.content}
                          onChange={(event) => {
                            const detailRows = [...evaluationData.detailRows]
                            detailRows[index] = {
                              ...row,
                              content: event.target.value,
                            }
                            setEvaluationData({
                              ...evaluationData,
                              detailRows,
                            })
                          }}
                          className="min-h-[60px] resize-none border-0 p-0 shadow-none focus-visible:ring-0"
                        />
                      ) : (
                        row.content
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          <SectionAddButtons
            disabled={!canEdit}
            onAddHeading={() => addSection("heading", "afterTemplate")}
            onAddBody={() => addSection("body", "afterTemplate")}
          />

          <div className="space-y-4">
            {evaluationData.sections.map((section, index) => (
              <div
                key={section.id}
                ref={setSectionRef(section.id)}
                className="flex scroll-mt-24 items-start gap-2 rounded-xl border border-border bg-card shadow-sm"
              >
                <div className="flex-1 p-4">
                  {section.type === "heading" ? (
                    canEdit ? (
                      <Input
                        value={section.title}
                        onChange={(event) =>
                          updateSection(section.id, {
                            title: event.target.value,
                          })
                        }
                        className="text-lg font-semibold"
                        placeholder="제목 입력"
                      />
                    ) : (
                      <h3 className="text-lg font-semibold">{section.title}</h3>
                    )
                  ) : (
                    <div>
                      <EditorToolbar />
                      {canEdit ? (
                        <Textarea
                          value={section.content}
                          onChange={(event) =>
                            updateSection(section.id, {
                              content: event.target.value,
                            })
                          }
                          className="min-h-[160px] resize-none rounded-t-none border-t-0"
                          placeholder="본문을 입력하세요"
                        />
                      ) : (
                        <p className="whitespace-pre-line rounded-b-lg border border-t-0 border-border p-4 text-sm leading-relaxed">
                          {section.content}
                        </p>
                      )}
                      {canEdit ? (
                        <div className="mt-3 flex items-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                          <Button variant="outline" size="sm" type="button">
                            <Upload className="mr-2 size-4" />
                            사진 및 파일 첨부
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            여기에 파일을 끌어 놓거나 왼쪽의 버튼을 클릭하세요.
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {canEdit ? (
                  <SectionControls
                    index={index}
                    onMove={moveSection}
                    onDelete={() => deleteSection(section.id)}
                  />
                ) : null}
              </div>
            ))}
          </div>

          <SectionAddButtons
            disabled={!canEdit}
            onAddHeading={() => addSection("heading", "end")}
            onAddBody={() => addSection("body", "end")}
          />

          {canEdit ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={() => void persist(evaluationData)}
              >
                {isSaving ? "저장 중..." : "임시 저장"}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
      </PrintArea>
    </div>
  )
}

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="w-24 border border-gray-300 bg-gray-50 px-3 py-2 text-center text-sm font-medium">
      {children}
    </th>
  )
}

function TableCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <td className={cn("border border-gray-300 px-3 py-2 text-sm", className)}>
      {children}
    </td>
  )
}

function EditorToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-gray-200 bg-gray-50 p-2">
      {["↶", "↷", "B", "I", "U", "S", "1.", "•"].map((item) => (
        <Button key={item} variant="ghost" size="sm" className="h-8 px-2">
          {item}
        </Button>
      ))}
    </div>
  )
}

function SectionAddButtons({
  disabled,
  onAddHeading,
  onAddBody,
}: {
  disabled: boolean
  onAddHeading: () => void
  onAddBody: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onAddHeading}
      >
        <Plus className="mr-1 size-3.5" />
        제목 추가
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onAddBody}
      >
        <Plus className="mr-1 size-3.5" />
        본문 추가
      </Button>
    </div>
  )
}

function SectionControls({
  index,
  onMove,
  onDelete,
}: {
  index: number
  onMove: (index: number, direction: "up" | "down") => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-6 p-0"
        onClick={() => onMove(index, "up")}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-6 p-0"
        onClick={() => onMove(index, "down")}
      >
        <ChevronDown className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-6 p-0 text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        삭제
      </Button>
    </div>
  )
}
