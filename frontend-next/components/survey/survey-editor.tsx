"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Calendar,
  Copy,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react"

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
import { cn } from "@/lib/utils"

type SidebarTab = "outline" | "style" | "settings"
type QuestionType = "text" | "choice" | "matrix" | "scale"

interface SurveyQuestion {
  id: string
  type: QuestionType
  title: string
  description: string
  required: boolean
  multiple?: boolean
  options: string[]
  rows: string[]
  columns: string[]
}

const createId = () => crypto.randomUUID()

const defaultQuestions: SurveyQuestion[] = [
  {
    id: createId(),
    type: "text",
    title: "프로그램 참여 후 좋았던 점은 무엇인가요?",
    description: "",
    required: true,
    options: [],
    rows: [],
    columns: [],
  },
  {
    id: createId(),
    type: "choice",
    title: "이 프로그램을 선택한 이유는 무엇인가요?",
    description: "",
    required: false,
    multiple: true,
    options: [
      "지인 추천",
      "강사 및 강의 평가가 좋아서",
      "관심 있는 주제여서",
      "가능한 시간대여서",
    ],
    rows: [],
    columns: [],
  },
  {
    id: createId(),
    type: "matrix",
    title: "프로그램 운영에 대해 평가해주세요.",
    description: "",
    required: true,
    options: [],
    rows: [
      "교육 내용이 이해하기 쉬웠다",
      "강사가 친절하게 설명했다",
      "참여 시간이 적절했다",
    ],
    columns: ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
  },
]

export function SurveyEditor({ id }: { id: string }) {
  const [selectedTab, setSelectedTab] = useState<SidebarTab>("outline")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const [overview, setOverview] = useState({
    purpose: ["이용자의 만족도와 개선 의견을 파악한다."],
    name: "춘천북부노인복지관 프로그램 만족도 조사",
    startDate: "",
    endDate: "",
    target: "프로그램 참여자",
    method: "설문조사",
    staff: "복지1팀 김영수 사회복지사",
    sampleCount: "",
    analysisMethod: "기술통계 빈도분석, 5점 척도",
  })

  const [basicInfo, setBasicInfo] = useState({
    title: "춘천북부노인복지관 프로그램 만족도 조사",
    description: "참여하신 프로그램에 대한 의견을 작성해주세요.",
    status: "draft",
  })

  const [questions, setQuestions] = useState<SurveyQuestion[]>(defaultQuestions)

  const questionSummary = useMemo(() => {
    const typeLabel: Record<QuestionType, string> = {
      text: "주관식",
      choice: "객관식",
      matrix: "표형",
      scale: "척도",
    }

    return questions.map((question, index) => ({
      id: question.id,
      label: `${index + 1}. ${question.title || "(질문 입력)"}`,
      type: typeLabel[question.type],
    }))
  }, [questions])

  const handleSave = async (saveType: "draft" | "publish") => {
    setIsSaving(true)

    const payload = {
        saveType,
        overview,
        basicInfo: {
        ...basicInfo,
        status: saveType === "publish" ? "active" : basicInfo.status,
        },
        questions,
    }

    const res = await fetch(`/api/surveys/${id}`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        alert("설문 저장에 실패했습니다.")
        setIsSaving(false)
        return
    }

    setLastSavedAt(new Date().toLocaleTimeString("ko-KR"))
    setIsSaving(false)

    if (saveType === "publish") {
        alert("설문이 저장되었습니다. 링크 복사 또는 QR 다운로드를 사용할 수 있습니다.")
    }
    }

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

  const addQuestion = (type: QuestionType = "text") => {
    const newQuestion: SurveyQuestion = {
      id: createId(),
      type,
      title: "",
      description: "",
      required: false,
      multiple: false,
      options: type === "choice" ? [""] : [],
      rows: type === "matrix" ? [""] : [],
      columns:
        type === "matrix"
          ? ["매우 불만족", "불만족", "보통", "만족", "매우 만족"]
          : [],
    }

    setQuestions((prev) => [...prev, newQuestion])
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
    <div className="space-y-4">
      <div className="sticky top-0 z-20 flex items-center justify-between rounded-xl border border-border bg-background/95 p-4 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-foreground">설문 편집</h2>
          <p className="text-sm text-muted-foreground">
            설문 내용을 수정한 뒤 저장할 수 있습니다.
            {lastSavedAt && ` 마지막 저장: ${lastSavedAt}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => handleSave("draft")}
          >
            임시저장
          </Button>

          <Button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave("publish")}
          >
            {isSaving ? "저장 중..." : "저장하기"}
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <SurveyOverviewForm
            overview={overview}
            onChange={setOverview}
            onAddPurpose={addPurpose}
            onUpdatePurpose={updatePurpose}
            onRemovePurpose={removePurpose}
            questionCount={questions.length}
          />

          <SurveyBasicInfoForm basicInfo={basicInfo} onChange={setBasicInfo} />

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <h3 className="font-semibold text-foreground">설문 문항</h3>
              <p className="text-sm text-muted-foreground">
                문항을 추가하고 유형별 옵션을 편집하세요.
              </p>
            </div>

            <div className="flex items-center gap-2">
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
            </div>
          </div>

          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
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
          questions={questionSummary}
        />
      </div>
    </div>
  )
}

function SurveyOverviewForm({
  overview,
  onChange,
  onAddPurpose,
  onUpdatePurpose,
  onRemovePurpose,
  questionCount,
}: {
  overview: {
    purpose: string[]
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
  questionCount: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
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
                  {String.fromCharCode(44032 + index)}.
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
      </div>
    </div>
  )
}

function SurveyBasicInfoForm({
  basicInfo,
  onChange,
}: {
  basicInfo: {
    title: string
    description: string
    status: string
  }
  onChange: React.Dispatch<
    React.SetStateAction<{
      title: string
      description: string
      status: string
    }>
  >
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-bold text-foreground">2. 기본 정보</h3>

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
            <SelectContent>
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
  question,
  index,
  onChange,
  onDelete,
  onDuplicate,
}: {
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
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <GripVertical className="size-4 text-muted-foreground" />

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

          <Button type="button" variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
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
            placeholder="참여자의 답변 입력란"
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

function SurveyOutlineSidebar({
  selectedTab,
  onChange,
  basicInfoTitle,
  questions,
}: {
  selectedTab: SidebarTab
  onChange: (tab: SidebarTab) => void
  basicInfoTitle: string
  questions: { id: string; label: string; type: string }[]
}) {
  return (
    <div className="w-72 shrink-0">
      <div className="sticky top-6 rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-4 border-b border-border pb-4">
          <OutlineTab
            active={selectedTab === "outline"}
            onClick={() => onChange("outline")}
          >
            목차
          </OutlineTab>
          <OutlineTab
            active={selectedTab === "style"}
            onClick={() => onChange("style")}
          >
            꾸미기
          </OutlineTab>
          <OutlineTab
            active={selectedTab === "settings"}
            onClick={() => onChange("settings")}
          >
            설문 설정
          </OutlineTab>
        </div>

        {selectedTab === "outline" && (
          <div className="space-y-1">
            <div className="rounded-lg border-2 border-primary bg-primary/5 p-2">
              <p className="text-xs font-medium text-primary">1/1 페이지</p>
              <p className="text-sm font-medium text-foreground">
                {basicInfoTitle || "설문 제목 없음"}
              </p>
            </div>

            <div className="space-y-1 pl-2">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="group flex items-center gap-2 rounded-lg p-2 text-sm text-muted-foreground hover:bg-muted"
                >
                  <span>{question.type}</span>
                  <span className="line-clamp-1">{question.label}</span>
                  <GripVertical className="ml-auto size-3 opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              설문에 참여해 주셔서 감사합니다.
            </p>
          </div>
        )}

        {selectedTab === "style" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>꾸미기 설정은 이후 연결하면 됩니다.</p>
            <Button variant="outline" size="sm">
              테마 색상 선택
            </Button>
          </div>
        )}

        {selectedTab === "settings" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>응답 받기</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span>중복 응답 허용</span>
              <Switch />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function OutlineTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-sm font-medium",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {children}
    </button>
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