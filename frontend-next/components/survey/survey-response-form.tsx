"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, FileText, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { resolveSurveyTheme } from "@/lib/survey-theme"
import { cn } from "@/lib/utils"
import { submitSurveyResponse } from "@/services/survey.service"
import type {
  SurveyAnswerValue,
  SurveyDetail,
  SurveyQuestion,
} from "@/services/survey.types"

type AnswersState = Record<string, SurveyAnswerValue>

const OTHER_VALUE = "__other__"

interface SurveyResponseFormProps {
  detail: SurveyDetail
}

function isChoiceAnswered(answer: Extract<SurveyAnswerValue, { type: "choice" }>) {
  if (Array.isArray(answer.value)) {
    return answer.value.length > 0
  }
  if (answer.value === OTHER_VALUE) {
    return Boolean(answer.other?.trim())
  }
  return Boolean(answer.value)
}

function isAnswered(answer: SurveyAnswerValue | undefined): boolean {
  if (!answer) return false

  switch (answer.type) {
    case "text":
      return answer.value.trim().length > 0
    case "scale":
      return answer.value >= 1
    case "choice":
      return isChoiceAnswered(answer)
    case "matrix":
      return Object.keys(answer.value).length > 0
    default:
      return false
  }
}

function validateRequired(
  questions: SurveyQuestion[],
  answers: AnswersState
): string | null {
  for (const question of questions) {
    if (!question.required) continue

    if (!isAnswered(answers[question.id])) {
      return `"${question.title || "? ??"}"?(?) ?? ?????.`
    }

    if (question.type === "matrix" && question.rows.length > 0) {
      const matrix = answers[question.id]
      if (matrix?.type !== "matrix") {
        return `"${question.title}"? ?? ?? ??? ???.`
      }

      const missingRow = question.rows.find((row) => !matrix.value[row]?.trim())
      if (missingRow) {
        return `"${question.title}" ? "${missingRow}"? ??? ???.`
      }
    }
  }

  return null
}

export function SurveyResponseForm({ detail }: SurveyResponseFormProps) {
  const { themeColor, useBrandClasses } = resolveSurveyTheme(detail)
  const [answers, setAnswers] = useState<AnswersState>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedMessage, setSubmittedMessage] = useState("")

  const isAccepting =
    detail.settings.acceptResponses && detail.basicInfo.status === "active"

  const progressPercent = useMemo(() => {
    if (detail.questions.length === 0) return 0
    const answered = detail.questions.filter((question) =>
      isAnswered(answers[question.id])
    ).length
    return Math.round((answered / detail.questions.length) * 100)
  }, [answers, detail.questions])

  const updateAnswer = (questionId: string, answer: SurveyAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    setErrors((prev) => {
      if (!prev[questionId]) return prev
      const next = { ...prev }
      delete next[questionId]
      return next
    })
    setFormError(null)
  }

  const handleSubmit = async () => {
    const validationError = validateRequired(detail.questions, answers)
    if (validationError) {
      setFormError(validationError)
      return
    }

    if (!detail.settings.allowDuplicate) {
      const storageKey = `survey-responded-${detail.id}`
      if (typeof window !== "undefined" && localStorage.getItem(storageKey)) {
        setFormError("?? ???????. ?? ??? ???? ????.")
        return
      }
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const result = await submitSurveyResponse(detail.id, {
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      })

      if (!detail.settings.allowDuplicate && typeof window !== "undefined") {
        localStorage.setItem(`survey-responded-${detail.id}`, result.responseId)
      }

      setSubmittedMessage(result.message)
      setIsSubmitted(true)
    } catch (error) {
      console.error("?? ?? ??:", error)
      setFormError("??? ??????. ?? ? ?? ??? ???.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAccepting) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-foreground">
          ?? ??? ?? ?? ?????.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {detail.basicInfo.status === "closed"
            ? "??? ???????."
            : detail.basicInfo.status === "draft"
              ? "?? ???? ?? ?????."
              : "?? ??? ???????."}
        </p>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-lg space-y-4 pb-12">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto size-14 text-primary" />
          <h2 className="mt-4 text-xl font-bold text-foreground">?? ??</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {submittedMessage || detail.style.thankYouMessage}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      className="mx-auto max-w-2xl pb-12"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
    >
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div
          className={cn(
            "flex h-40 items-center justify-center",
            useBrandClasses &&
              "bg-gradient-to-br from-primary via-primary/85 to-primary/60"
          )}
          style={
            useBrandClasses
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}99 55%, ${themeColor}66 100%)`,
                }
          }
        >
          <FileText className="size-16 text-primary-foreground drop-shadow-sm" />
        </div>

        <div className="p-6">
          <h1 className="mb-2 text-xl font-bold leading-snug text-foreground">
            {detail.style.coverTitle || detail.basicInfo.title}
          </h1>
          <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {detail.style.coverDescription || detail.basicInfo.description}
          </p>
          {detail.style.coverPeriodLabel ? (
            <p className="text-xs text-muted-foreground">
              {detail.style.coverPeriodLabel}
            </p>
          ) : null}
        </div>
      </div>

      {detail.settings.showProgress ? (
        <div className="mb-6">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>?? ???</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                useBrandClasses && "bg-primary"
              )}
              style={
                useBrandClasses
                  ? { width: `${progressPercent}%` }
                  : {
                      width: `${progressPercent}%`,
                      backgroundColor: themeColor,
                    }
              }
            />
          </div>
        </div>
      ) : null}

      {detail.questions.map((question, index) => (
        <ResponseQuestion
          key={question.id}
          question={question}
          index={index + 1}
          answer={answers[question.id]}
          error={errors[question.id]}
          themeColor={themeColor}
          useBrandClasses={useBrandClasses}
          onChange={(answer) => updateAnswer(question.id, answer)}
        />
      ))}

      {formError ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            ?? ?...
          </>
        ) : (
          "?? ??"
        )}
      </Button>
    </form>
  )
}

function ResponseQuestion({
  question,
  index,
  answer,
  error,
  themeColor,
  useBrandClasses,
  onChange,
}: {
  question: SurveyQuestion
  index: number
  answer?: SurveyAnswerValue
  error?: string
  themeColor: string
  useBrandClasses: boolean
  onChange: (answer: SurveyAnswerValue) => void
}) {
  return (
    <div
      className={cn(
        "mb-5 rounded-2xl border bg-card p-6 shadow-sm",
        error ? "border-destructive" : "border-border"
      )}
    >
      <h3 className="mb-1 text-base font-semibold text-foreground">
        {question.required ? (
          <span
            className={cn("mr-1", useBrandClasses && "text-primary")}
            style={useBrandClasses ? undefined : { color: themeColor }}
          >
            *
          </span>
        ) : null}
        {index}. {question.title}
      </h3>

      {question.description ? (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {question.description}
        </p>
      ) : null}

      {question.type === "text" && (
        <Textarea
          value={answer?.type === "text" ? answer.value : ""}
          maxLength={2000}
          placeholder="??? ??? ??? (?? 2000?)"
          className="min-h-[120px] resize-none"
          onChange={(event) =>
            onChange({ type: "text", value: event.target.value })
          }
        />
      )}

      {question.type === "scale" && (
        <ScaleInput
          value={answer?.type === "scale" ? answer.value : undefined}
          useBrandClasses={useBrandClasses}
          themeColor={themeColor}
          onChange={(value) => onChange({ type: "scale", value })}
        />
      )}

      {question.type === "choice" && (
        <ChoiceInput
          question={question}
          answer={answer?.type === "choice" ? answer : undefined}
          useBrandClasses={useBrandClasses}
          themeColor={themeColor}
          onChange={(value, other) =>
            onChange({ type: "choice", value, other })
          }
        />
      )}

      {question.type === "matrix" && (
        <MatrixInput
          question={question}
          value={answer?.type === "matrix" ? answer.value : {}}
          useBrandClasses={useBrandClasses}
          themeColor={themeColor}
          onChange={(value) => onChange({ type: "matrix", value })}
        />
      )}

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function ScaleInput({
  value,
  useBrandClasses,
  themeColor,
  onChange,
}: {
  value?: number
  useBrandClasses: boolean
  themeColor: string
  onChange: (value: number) => void
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex min-w-[520px] items-center justify-between gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">?? ???</span>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-1">
          {Array.from({ length: 10 }).map((_, scaleIndex) => {
            const score = scaleIndex + 1
            const selected = value === score

            return (
              <button
                key={score}
                type="button"
                onClick={() => onChange(score)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border text-xs transition-colors",
                  selected
                    ? useBrandClasses
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-white"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                )}
                style={
                  selected && !useBrandClasses
                    ? { backgroundColor: themeColor, borderColor: themeColor }
                    : undefined
                }
              >
                {score}
              </button>
            )
          })}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">?? ??</span>
      </div>
    </div>
  )
}

function ChoiceInput({
  question,
  answer,
  useBrandClasses,
  themeColor,
  onChange,
}: {
  question: SurveyQuestion
  answer?: { value: string | string[]; other?: string }
  useBrandClasses: boolean
  themeColor: string
  onChange: (value: string | string[], other?: string) => void
}) {
  const [otherText, setOtherText] = useState(answer?.other ?? "")
  const selected = answer?.value
  const isMultiple = Boolean(question.multiple)

  const toggleOption = (option: string) => {
    if (isMultiple) {
      const current = Array.isArray(selected) ? selected : []
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
      onChange(next, otherText)
      return
    }

    onChange(option, otherText)
  }

  const isOptionChecked = (option: string) => {
    if (isMultiple && Array.isArray(selected)) {
      return selected.includes(option)
    }
    return selected === option
  }

  const isOtherSelected = Boolean(
    otherText.trim() ||
      selected === OTHER_VALUE ||
      (Array.isArray(selected) && selected.length === 0 && otherText.trim())
  )

  return (
    <div className="space-y-2">
      {question.options.map((option, optionIndex) => {
        const label = option || `??? ${optionIndex + 1}`

        return (
          <label
            key={optionIndex}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
              isOptionChecked(label)
                ? "border-primary/50 bg-primary/5"
                : "border-border hover:bg-muted/30"
            )}
          >
            <input
              type={isMultiple ? "checkbox" : "radio"}
              name={question.id}
              checked={isOptionChecked(label)}
              className={cn("size-4", useBrandClasses && "accent-primary")}
              style={
                useBrandClasses ? undefined : { accentColor: themeColor }
              }
              onChange={() => toggleOption(label)}
            />
            <span>{label}</span>
          </label>
        )
      })}

      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors",
          isOtherSelected
            ? "border-primary/50 bg-primary/5"
            : "border-border text-muted-foreground"
        )}
      >
        <input
          type={isMultiple ? "checkbox" : "radio"}
          name={question.id}
          checked={isOtherSelected}
          className={cn("size-4", useBrandClasses && "accent-primary")}
          style={useBrandClasses ? undefined : { accentColor: themeColor }}
          onChange={() => {
            if (isMultiple) {
              onChange(Array.isArray(selected) ? selected : [], otherText)
            } else {
              onChange(OTHER_VALUE, otherText)
            }
          }}
        />
        <span className="shrink-0">??</span>
        <Input
          value={otherText}
          placeholder="?? ??"
          className="h-8 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
          onChange={(event) => {
            const next = event.target.value
            setOtherText(next)
            if (isMultiple) {
              onChange(Array.isArray(selected) ? selected : [], next)
            } else {
              onChange(OTHER_VALUE, next)
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      </label>
    </div>
  )
}

function MatrixInput({
  question,
  value,
  useBrandClasses,
  themeColor,
  onChange,
}: {
  question: SurveyQuestion
  value: Record<string, string>
  useBrandClasses: boolean
  themeColor: string
  onChange: (value: Record<string, string>) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="pb-3 pr-4 text-left font-normal" />
            {question.columns.map((column) => (
              <th key={column} className="px-2 pb-3 text-center font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {question.rows.map((row) => (
            <tr key={row} className="border-t border-border">
              <td className="py-3 pr-4 text-sm font-medium text-foreground">
                {row}
              </td>
              {question.columns.map((column) => (
                <td key={column} className="px-2 py-3 text-center">
                  <input
                    type="radio"
                    name={`${question.id}-${row}`}
                    checked={value[row] === column}
                    className={cn(
                      "size-4 cursor-pointer",
                      useBrandClasses && "accent-primary"
                    )}
                    style={
                      useBrandClasses ? undefined : { accentColor: themeColor }
                    }
                    onChange={() => onChange({ ...value, [row]: column })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
