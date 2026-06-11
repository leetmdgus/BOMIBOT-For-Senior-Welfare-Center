"use client"

import { FileText } from "lucide-react"

import { Textarea } from "@/components/ui/textarea"
import { DEFAULT_SURVEY_THEME } from "@/lib/constants/brand"
import { cn } from "@/lib/utils"
import type { SurveyDetail, SurveyQuestion } from "@/services/survey.types"

interface SurveyPreviewProps {
  detail: SurveyDetail
}

function resolveThemeColor(detail: SurveyDetail) {
  const color = detail.style.themeColor?.trim()
  if (!color || color === "#03c75a" || color === "#3b82f6" || color === "#0ea5e9") {
    return DEFAULT_SURVEY_THEME
  }
  return color
}

export function SurveyPreview({ detail }: SurveyPreviewProps) {
  const themeColor = resolveThemeColor(detail)
  const useBrandClasses =
    themeColor === DEFAULT_SURVEY_THEME || themeColor.includes("oklch")

  return (
    <div className="mx-auto max-w-2xl pb-12">
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
          <h2 className="mb-2 text-xl font-bold leading-snug text-foreground">
            {detail.style.coverTitle || detail.basicInfo.title}
          </h2>
          <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {detail.style.coverDescription || detail.basicInfo.description}
          </p>
          <p className="text-xs text-muted-foreground">
            {detail.style.coverPeriodLabel}
          </p>
        </div>
      </div>

      {detail.settings.showProgress ? (
        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full w-1/3 rounded-full",
              useBrandClasses && "bg-primary"
            )}
            style={useBrandClasses ? undefined : { backgroundColor: themeColor }}
          />
        </div>
      ) : null}

      {detail.questions.map((question, index) => (
        <PreviewQuestion
          key={question.id}
          question={question}
          index={index + 1}
          themeColor={themeColor}
          useBrandClasses={useBrandClasses}
        />
      ))}

      <div
        className={cn(
          "rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground",
          useBrandClasses && "border-primary/30"
        )}
        style={useBrandClasses ? undefined : { borderColor: `${themeColor}44` }}
      >
        {detail.style.thankYouMessage}
      </div>
    </div>
  )
}

function PreviewQuestion({
  question,
  index,
  themeColor,
  useBrandClasses,
}: {
  question: SurveyQuestion
  index: number
  themeColor: string
  useBrandClasses: boolean
}) {
  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
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
          placeholder="답변을 입력해 주세요 (최대 2000자)"
          className="min-h-[120px] resize-none border-muted bg-muted/40"
          disabled
        />
      )}

      {question.type === "scale" && (
        <div className="overflow-x-auto rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex min-w-[520px] items-center justify-between gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">
              매우 불만족
            </span>
            <div className="flex flex-1 items-center justify-center gap-1">
              {Array.from({ length: 10 }).map((_, scaleIndex) => (
                <label
                  key={scaleIndex}
                  className="flex size-8 cursor-default items-center justify-center rounded-full border border-border bg-background text-xs text-muted-foreground"
                >
                  {scaleIndex + 1}
                </label>
              ))}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              매우 만족
            </span>
          </div>
        </div>
      )}

      {question.type === "choice" && (
        <div className="space-y-2">
          {question.options.map((option, optionIndex) => (
            <label
              key={optionIndex}
              className="flex cursor-default items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted/30"
            >
              <input
                type={question.multiple ? "checkbox" : "radio"}
                name={question.id}
                className={cn(
                  "size-4",
                  useBrandClasses && "accent-primary"
                )}
                style={
                  useBrandClasses ? undefined : { accentColor: themeColor }
                }
                disabled
              />
              <span>{option || `선택지 ${optionIndex + 1}`}</span>
            </label>
          ))}
          {question.options.length > 0 ? (
            <label className="flex cursor-default items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              <input
                type={question.multiple ? "checkbox" : "radio"}
                disabled
                className="size-4"
              />
              기타
            </label>
          ) : null}
        </div>
      )}

      {question.type === "matrix" && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="pb-3 pr-4 text-left font-normal" />
                {question.columns.map((column) => (
                  <th
                    key={column}
                    className="px-2 pb-3 text-center font-medium"
                  >
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
                        className={cn(
                          "size-4",
                          useBrandClasses && "accent-primary"
                        )}
                        style={
                          useBrandClasses
                            ? undefined
                            : { accentColor: themeColor }
                        }
                        disabled
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
