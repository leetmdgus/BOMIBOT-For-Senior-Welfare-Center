"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react"
import { Calendar, Copy, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { getSurveyDetail, saveSurvey } from "@/services/survey.service"
import {
  SurveyOutlineSidebar,
  type SurveySidebarTab,
} from "@/components/survey/survey-outline-sidebar"
import {
  surveyQuestionSectionId,
  surveySectionId,
  useSurveySectionScroll,
} from "@/components/survey/use-survey-section-scroll"
import type {
  SurveyDetail,
  SurveyQuestion,
  SurveyQuestionType,
} from "@/services/survey.types"

type QuestionType = SurveyQuestionType

const createId = () => crypto.randomUUID()

// 가·나·다·라… 순서 마커. 한글 음절 코드는 +1 증가가 아니므로(가 다음이 각)
// String.fromCharCode(44032 + index)는 가·각·갂… 이 되어 잘못된다. 배열로 매핑.
const KOREAN_ORDER_MARKERS = [
  "가", "나", "다", "라", "마", "바", "사", "아", "자", "차",
  "카", "타", "파", "하",
]
const koreanOrderMarker = (index: number) =>
  KOREAN_ORDER_MARKERS[index] ?? `${index + 1}`

export interface SurveyEditorHandle {
  saveDraft: () => void
  savePublish: () => void
}

export const SurveyEditor = forwardRef<
  SurveyEditorHandle,
  {
    id: string
    taskId?: string
    initialDetail?: SurveyDetail
    scrollRoot?: HTMLElement | null
    onSaved?: (detail: SurveyDetail) => void
    onSavingChange?: (isSaving: boolean) => void
  }
>(function SurveyEditor(
  { id, taskId, initialDetail, scrollRoot, onSaved, onSavingChange },
  ref
) {
  const [selectedTab, setSelectedTab] = useState<SurveySidebarTab>("outline")
  const [isSaving, setIsSaving] = useState(false)

  const [overview, setOverview] = useState(
    initialDetail?.overview ?? {
      purpose: ["이용자의 만족도와 개선 의견을 파악한다."],
      limitations: ["표본 수가 제한적일 수 있습니다."],
      name: "",
      startDate: "",
      endDate: "",
      target: "프로그램 참여자",
      method: "온라인 설문",
      staff: "",
      sampleCount: "",
      analysisMethod: "기술통계, 5점 척도",
    }
  )

  const [basicInfo, setBasicInfo] = useState(
    initialDetail?.basicInfo ?? {
      title: "",
      description: "",
      category: "만족도조사",
      status: "draft" as const,
    }
  )

  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    initialDetail?.questions ?? []
  )

  useEffect(() => {
    if (!initialDetail) return

    setOverview(initialDetail.overview)
    setBasicInfo(initialDetail.basicInfo)
    setQuestions(initialDetail.questions)
  }, [initialDetail])

  const outlineSections = useMemo(() => {
    const typeLabel: Record<QuestionType, string> = {
      text: "주관식",
      choice: "객관식",
      matrix: "표형",
      scale: "척도",
    }

    return [
      { id: surveySectionId("overview"), label: "1. 조사 개요", type: "섹션" },
      { id: surveySectionId("basic"), label: "2. 기본 항목", type: "섹션" },
      ...questions.map((question, index) => ({
        id: surveyQuestionSectionId(question.id),
        label: `${index + 1}. ${question.title || "(질문 입력)"}`,
        type: typeLabel[question.type],
      })),
    ]
  }, [questions])

  const { activeSectionId, scrollToSection } = useSurveySectionScroll(
    scrollRoot ?? null,
    outlineSections.length
  )

  const handleSave = async (saveType: "draft" | "publish") => {
    setIsSaving(true)
    onSavingChange?.(true)

    try {
      const result = await saveSurvey(id, {
        saveType,
        overview,
        basicInfo: {
          ...basicInfo,
          status: saveType === "publish" ? "active" : basicInfo.status,
        },
        questions,
        style: initialDetail?.style,
        settings: initialDetail?.settings,
        taskId: taskId ?? initialDetail?.taskId,
      })

      const nextDetail = await getSurveyDetail(result.id, {
        taskId: taskId ?? initialDetail?.taskId,
      })
      onSaved?.(nextDetail)

      if (saveType === "publish") {
        alert(
          "설문이 저장되었습니다. 설문 링크 복사 또는 QR 다운로드를 사용할 수 있습니다."
        )
      }
    } catch (error) {
      console.error("설문 저장 실패:", error)
      alert("설문 저장에 실패했습니다.")
    } finally {
      setIsSaving(false)
      onSavingChange?.(false)
    }
  }

  useImperativeHandle(ref, () => ({
    saveDraft: () => {
      void handleSave("draft")
    },
    savePublish: () => {
      void handleSave("publish")
    },
  }))

  const addPurpose = () => {
    setOverview((prev) => ({
      ...prev,
      purpose: [...prev.purpose, ""],
    }))
  }

  const updatePurpose = (index: number, value: string) => {
    setOverview((prev) => ({
      ...prev,
      purpose: prev.purpose.map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    }))
  }

  const removePurpose = (index: number) => {
    setOverview((prev) => ({
      ...prev,
      purpose:
        prev.purpose.length > 1
          ? prev.purpose.filter((_, itemIndex) => itemIndex !== index)
          : prev.purpose,
    }))
  }

  const addLimitation = () => {
    setOverview((prev) => ({
      ...prev,
      limitations: [...prev.limitations, ""],
    }))
  }

  const updateLimitation = (index: number, value: string) => {
    setOverview((prev) => ({
      ...prev,
      limitations: prev.limitations.map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    }))
  }

  const removeLimitation = (index: number) => {
    setOverview((prev) => ({
      ...prev,
      limitations:
        prev.limitations.length > 1
          ? prev.limitations.filter((_, itemIndex) => itemIndex !== index)
          : prev.limitations,
    }))
  }

  const addQuestion = (type: QuestionType = "text") => {
    const newQuestion: SurveyQuestion = {
      id: createId(),
      type,
      title: "",
      description: "",
      required: true,
      multiple: false,
      options: type === "choice" ? [""] : [],
      rows: type === "matrix" ? [""] : [],
      columns:
        type === "matrix"
          ? ["매우 불만족", "불만족", "보통", "만족", "매우 만족"]
          : [],
    }

    setQuestions((prev) => [...prev, newQuestion])
    // 새 문항이 그려진 뒤(더블 rAF) 해당 문항으로 스크롤.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        scrollToSection(surveyQuestionSectionId(newQuestion.id)),
      ),
    )
  }

  const updateQuestion = (
    questionId: string,
    patch: Partial<SurveyQuestion>
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question
      )
    )
  }

  const removeQuestion = (questionId: string) => {
    setQuestions((prev) =>
      prev.length > 1
        ? prev.filter((question) => question.id !== questionId)
        : prev
    )
  }

  const duplicateQuestion = (questionId: string) => {
    setQuestions((prev) => {
      const target = prev.find((question) => question.id === questionId)
      if (!target) return prev

      const copiedQuestion: SurveyQuestion = {
        ...target,
        id: createId(),
        title: `${target.title} 복사본`,
      }

      const targetIndex = prev.findIndex(
        (question) => question.id === questionId
      )

      const next = [...prev]
      next.splice(targetIndex + 1, 0, copiedQuestion)

      return next
    })
  }

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <SurveyOverviewForm
          sectionId={surveySectionId("overview")}
          overview={overview}
          onChange={setOverview}
          onAddPurpose={addPurpose}
          onUpdatePurpose={updatePurpose}
          onRemovePurpose={removePurpose}
          onAddLimitation={addLimitation}
          onUpdateLimitation={updateLimitation}
          onRemoveLimitation={removeLimitation}
          questionCount={questions.length}
        />

        <SurveyBasicInfoForm
          sectionId={surveySectionId("basic")}
          basicInfo={basicInfo}
          onChange={setBasicInfo}
        />

        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <h3 className="font-semibold text-foreground">설문 문항</h3>
            <p className="text-sm text-muted-foreground">
              문항을 추가하고 유형별 옵션을 편집하세요.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => addQuestion("text")}>
              <Plus className="mr-2 size-4" />
              주관식
            </Button>
            <Button variant="outline" onClick={() => addQuestion("choice")}>
              <Plus className="mr-2 size-4" />
              객관식
            </Button>
            <Button variant="outline" onClick={() => addQuestion("matrix")}>
              <Plus className="mr-2 size-4" />
              표형
            </Button>
            <Button variant="outline" onClick={() => addQuestion("scale")}>
              <Plus className="mr-2 size-4" />
              척도
            </Button>
          </div>
        </div>

        {questions.map((question, index) => (
          <QuestionEditor
            key={question.id}
            sectionId={surveyQuestionSectionId(question.id)}
            question={question}
            index={index}
            onChange={updateQuestion}
            onDelete={removeQuestion}
            onDuplicate={duplicateQuestion}
          />
        ))}
      </div>

      <SurveyOutlineSidebar
        selectedTab={selectedTab}
        onChange={setSelectedTab}
        basicInfoTitle={basicInfo.title}
        sections={outlineSections}
        activeSectionId={activeSectionId}
        onNavigate={scrollToSection}
      />
    </div>
  )
})

function SurveyOverviewForm({
  sectionId,
  overview,
  onChange,
  onAddPurpose,
  onUpdatePurpose,
  onRemovePurpose,
  onAddLimitation,
  onUpdateLimitation,
  onRemoveLimitation,
  questionCount,
}: {
  sectionId: string
  overview: {
    purpose: string[]
    limitations: string[]
    name: string
    startDate: string
    endDate: string
    target: string
    method: string
    staff: string
    sampleCount: string
    analysisMethod: string
  }
  onChange: React.Dispatch<
    React.SetStateAction<{
      purpose: string[]
      limitations: string[]
      name: string
      startDate: string
      endDate: string
      target: string
      method: string
      staff: string
      sampleCount: string
      analysisMethod: string
    }>
  >
  onAddPurpose: () => void
  onUpdatePurpose: (index: number, value: string) => void
  onRemovePurpose: (index: number) => void
  onAddLimitation: () => void
  onUpdateLimitation: (index: number, value: string) => void
  onRemoveLimitation: (index: number) => void
  questionCount: number
}) {
  return (
    <div
      id={sectionId}
      className="scroll-mt-6 rounded-xl border border-border bg-card p-6"
    >
      <h3 className="mb-4 text-lg font-bold text-foreground">1. 조사 개요</h3>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            조사목적
          </label>

          <div className="space-y-2">
            {overview.purpose.map((purpose, index) => (
              <div key={index} className="flex gap-2">
                <span className="pt-2 text-muted-foreground">
                  {koreanOrderMarker(index)}.
                </span>
                <Input
                  value={purpose}
                  onChange={(event) =>
                    onUpdatePurpose(index, event.target.value)
                  }
                  placeholder="목적 입력"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => onRemovePurpose(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="link"
            className="mt-2 text-primary"
            onClick={onAddPurpose}
          >
            <Plus className="mr-1 size-3" />
            목적 항목 추가
          </Button>
        </div>

        <FormInput
          label="가. 조사명"
          value={overview.name}
          onChange={(value) => onChange((prev) => ({ ...prev, name: value }))}
          placeholder="예: 경로식당 이용 만족도 조사"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            나. 조사기간
          </label>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-40"
              value={overview.startDate}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  startDate: event.target.value,
                }))
              }
            />
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">~</span>
            <Input
              type="date"
              className="w-40"
              value={overview.endDate}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  endDate: event.target.value,
                }))
              }
            />
            <Calendar className="size-4 text-muted-foreground" />
          </div>
        </div>

        <FormInput
          label="다. 조사대상"
          value={overview.target}
          onChange={(value) => onChange((prev) => ({ ...prev, target: value }))}
          placeholder="예: 프로그램 참여자 30명"
        />

        <FormInput
          label="라. 조사방법"
          value={overview.method}
          onChange={(value) => onChange((prev) => ({ ...prev, method: value }))}
          placeholder="예: 설문조사"
        />

        <FormInput
          label="마. 문항구성"
          value={`총 ${questionCount}개 문항`}
          disabled
          onChange={() => {}}
          placeholder=""
        />

        <FormInput
          label="바. 조사인력"
          value={overview.staff}
          onChange={(value) => onChange((prev) => ({ ...prev, staff: value }))}
          placeholder="복지1팀 김영수 사회복지사"
        />

        <FormInput
          label="사. 통계수량"
          value={overview.sampleCount}
          onChange={(value) =>
            onChange((prev) => ({ ...prev, sampleCount: value }))
          }
          placeholder="0"
        />

        <FormInput
          label="아. 분석방법"
          value={overview.analysisMethod}
          onChange={(value) =>
            onChange((prev) => ({ ...prev, analysisMethod: value }))
          }
          placeholder="예: 기술통계 빈도분석, 5점 척도"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            자. 조사의 한계점
          </label>

          <div className="space-y-2">
            {overview.limitations.map((limitation, index) => (
              <div key={index} className="flex gap-2">
                <span className="pt-2 text-muted-foreground">
                  {koreanOrderMarker(index)}.
                </span>
                <Input
                  value={limitation}
                  onChange={(event) =>
                    onUpdateLimitation(index, event.target.value)
                  }
                  placeholder="한계점 입력"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => onRemoveLimitation(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="link"
            className="mt-2 text-primary"
            onClick={onAddLimitation}
          >
            <Plus className="mr-1 size-3" />
            한계점 항목 추가
          </Button>
        </div>
      </div>
    </div>
  )
}

function SurveyBasicInfoForm({
  sectionId,
  basicInfo,
  onChange,
}: {
  sectionId: string
  basicInfo: {
    title: string
    description: string
    category?: string
    status: string
  }
  onChange: React.Dispatch<
    React.SetStateAction<{
      title: string
      description: string
      category?: string
      status: string
    }>
  >
}) {
  return (
    <div
      id={sectionId}
      className="scroll-mt-6 rounded-xl border border-border bg-card p-6"
    >
      <h3 className="mb-4 text-lg font-bold text-foreground">2. 기본 항목</h3>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            설문 제목 <span className="text-destructive">*</span>
          </label>
          <Input
            value={basicInfo.title}
            onChange={(event) =>
              onChange((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="설문 제목을 입력하세요"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            설명
          </label>
          <Textarea
            value={basicInfo.description}
            onChange={(event) =>
              onChange((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            placeholder="설문 설명"
            className="min-h-[80px]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            카테고리
          </label>
          <Select
            value={basicInfo.category ?? "만족도조사"}
            onValueChange={(value) =>
              onChange((prev) => ({ ...prev, category: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="만족도조사">만족도조사</SelectItem>
              <SelectItem value="사전조사">사전조사</SelectItem>
              <SelectItem value="사후평가">사후평가</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            상태
          </label>

          <Select
            value={basicInfo.status}
            onValueChange={(value) =>
              onChange((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50 bg-card text-card-foreground">
              <SelectItem value="draft">임시저장</SelectItem>
              <SelectItem value="active">진행중</SelectItem>
              <SelectItem value="closed">마감</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

function QuestionEditor({
  sectionId,
  question,
  index,
  onChange,
  onDelete,
  onDuplicate,
}: {
  sectionId: string
  question: SurveyQuestion
  index: number
  onChange: (questionId: string, patch: Partial<SurveyQuestion>) => void
  onDelete: (questionId: string) => void
  onDuplicate: (questionId: string) => void
}) {
  const changeType = (type: QuestionType) => {
    onChange(question.id, {
      type,
      options:
        type === "choice"
          ? question.options.length
            ? question.options
            : [""]
          : [],
      rows:
        type === "matrix" ? (question.rows.length ? question.rows : [""]) : [],
      columns:
        type === "matrix"
          ? question.columns.length
            ? question.columns
            : ["매우 불만족", "불만족", "보통", "만족", "매우 만족"]
          : [],
    })
  }

  return (
    <div
      id={sectionId}
      className="scroll-mt-6 rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={question.type} onValueChange={changeType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">주관식 서술형</SelectItem>
              <SelectItem value="choice">객관식</SelectItem>
              <SelectItem value="matrix">표형</SelectItem>
              <SelectItem value="scale">척도</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">답변 필수</span>
          <Switch
            checked={question.required}
            onCheckedChange={(checked) =>
              onChange(question.id, { required: checked })
            }
          />

          {question.type === "choice" && (
            <>
              <span className="text-sm text-muted-foreground">복수 선택</span>
              <Switch
                checked={question.multiple}
                onCheckedChange={(checked) =>
                  onChange(question.id, { multiple: checked })
                }
              />
            </>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDuplicate(question.id)}
          >
            <Copy className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(question.id)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {index + 1}. 질문 제목
          </label>
          <Input
            value={question.title}
            onChange={(event) =>
              onChange(question.id, { title: event.target.value })
            }
            placeholder="질문을 입력하세요"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            설명
          </label>
          <Input
            value={question.description}
            onChange={(event) =>
              onChange(question.id, { description: event.target.value })
            }
            placeholder="설명 입력"
          />
        </div>

        {question.type === "text" && (
          <Textarea
            placeholder="참여자의 답변 입력란 (최대 2000자)"
            className="min-h-[100px] bg-muted/50"
            disabled
          />
        )}

        {question.type === "scale" && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">매우 불만족</span>
              <div className="flex items-center gap-2">
                {Array.from({ length: 10 }).map((_, scaleIndex) => (
                  <span
                    key={scaleIndex}
                    className="flex size-7 items-center justify-center rounded-full border text-xs"
                  >
                    {scaleIndex + 1}
                  </span>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">매우 만족</span>
            </div>
          </div>
        )}

        {question.type === "choice" && (
          <ChoiceEditor question={question} onChange={onChange} />
        )}

        {question.type === "matrix" && (
          <MatrixEditor question={question} onChange={onChange} />
        )}
      </div>
    </div>
  )
}

function ChoiceEditor({
  question,
  onChange,
}: {
  question: SurveyQuestion
  onChange: (questionId: string, patch: Partial<SurveyQuestion>) => void
}) {
  const updateOption = (index: number, value: string) => {
    onChange(question.id, {
      options: question.options.map((option, optionIndex) =>
        optionIndex === index ? value : option
      ),
    })
  }

  const addOption = () => {
    onChange(question.id, {
      options: [...question.options, ""],
    })
  }

  const removeOption = (index: number) => {
    onChange(question.id, {
      options:
        question.options.length > 1
          ? question.options.filter((_, optionIndex) => optionIndex !== index)
          : question.options,
    })
  }

  return (
    <div className="space-y-2">
      {question.options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-muted-foreground">=</span>
          <Input
            value={option}
            onChange={(event) => updateOption(index, event.target.value)}
            placeholder={`항목 ${index + 1}`}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeOption(index)}
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={addOption}
      >
        <Plus className="mr-1 size-3" />
        항목 추가
      </Button>
    </div>
  )
}

function MatrixEditor({
  question,
  onChange,
}: {
  question: SurveyQuestion
  onChange: (questionId: string, patch: Partial<SurveyQuestion>) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <MatrixInputGroup
        title="행"
        items={question.rows}
        addLabel="행 추가"
        onChange={(items) => onChange(question.id, { rows: items })}
      />

      <MatrixInputGroup
        title="열"
        items={question.columns}
        addLabel="열 추가"
        onChange={(items) => onChange(question.id, { columns: items })}
      />
    </div>
  )
}

function MatrixInputGroup({
  title,
  items,
  addLabel,
  onChange,
}: {
  title: string
  items: string[]
  addLabel: string
  onChange: (items: string[]) => void
}) {
  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  const addItem = () => {
    onChange([...items, ""])
  }

  const removeItem = (index: number) => {
    onChange(
      items.length > 1
        ? items.filter((_, itemIndex) => itemIndex !== index)
        : items
    )
  }

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-foreground">{title}</h4>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-muted-foreground">=</span>
            <Input
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              className="flex-1"
              placeholder={`${title} ${index + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-1 size-3" />
          {addLabel}
        </Button>
      </div>
    </div>
  )
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}