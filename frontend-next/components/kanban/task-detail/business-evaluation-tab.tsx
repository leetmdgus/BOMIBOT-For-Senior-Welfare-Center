"use client"

import { useState, type ReactNode } from "react"
import { Pencil, Printer } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type EvaluationData = {
  team: string
  manager: string
  period: string
  programName: string
  target: string
  planCount: string
  planBudget: string
  actualCount: string
  actualExpense: string
  purpose: string
  goals: string[]
  performanceIndicator: string
  evaluationTool: string
  keyFactorAnalysis: string
  goalAppropriacy: string
  suggestion: string
  supervision: string
}

export function BusinessEvaluationTab() {
  const [showBothPanels, setShowBothPanels] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)

  const [evaluationData, setEvaluationData] = useState<EvaluationData>({
    team: "복지1팀",
    manager: "복지1팀 김연수 사회복지사",
    period: "2026-01-01 ~ 2026-12-31",
    programName: "일반상담 및 정보제공사업",
    target: "춘천시 거주 만 60세 이상 어르신 중 복지관 이용 희망자 및 이용자",
    planCount: "2,960명 / 2,965회",
    planBudget: "금 15,000,000원 (천오백만)",
    actualCount: "896명 / 896회",
    actualExpense: "-",
    purpose:
      "개별 욕구에 적합한 상담으로 정보 및 복지서비스를 제공하여 건강하고 안정적인 노후 생활 지원",
    goals: [
      "초기상담을 통한 욕구 파악으로 이용자 편리성 증진",
      "기관 사업 및 이용 규정에 대한 이해도 향상",
      "전문지식 제공으로 노년기 문제 해결 능력 강화",
    ],
    performanceIndicator: "한 줄씩 입력하면 목록으로 표시됩니다",
    evaluationTool: "한 줄씩 입력하면 목록으로 표시됩니다",
    keyFactorAnalysis: "한 줄씩 입력하면 목록으로 표시됩니다",
    goalAppropriacy: "한 줄씩 입력하면 목록으로 표시됩니다",
    suggestion: "한 줄씩 입력하면 목록으로 표시됩니다",
    supervision: "",
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <div>
      <div className="mb-4">
        {/* <h1 className="mb-4 text-xl font-semibold">사업평가서</h1> */}

        <div className="mb-2 flex items-center gap-2">

        </div>

        <Button
          variant={showBothPanels ? "default" : "outline"}
          size="sm"
          onClick={() => setShowBothPanels((prev) => !prev)}
          className={!showBothPanels ? "border-primary text-primary" : undefined}
        >
          사업계획서 함께 보기 ({showBothPanels ? "끄기" : "켜기"})
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-6",
          showBothPanels ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        {showBothPanels && (
          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">사업계획서</h3>

            <table className="w-full border-collapse border border-gray-300 text-sm">
              <tbody>
                <SimpleRow label="사 업 명" value="일반상담 및 정보제공사업" />
                <SimpleRow label="목 적" value={evaluationData.purpose} primary />
                <SimpleRow label="사 업 대 상" value={evaluationData.target} />
                <SimpleRow label="연인원수/횟수" value={evaluationData.planCount} />
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-6 text-center text-lg font-semibold">
            일반상담 및 정보제공사업 최종사업평가서
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
                  <Input type="date" className="h-auto border-0 p-0" />
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

              <tr>
                <TableHeader>슈퍼비전</TableHeader>
                <td className="border border-gray-300 px-3 py-2" colSpan={3}>
                  {isEditMode ? (
                    <Textarea
                      value={evaluationData.supervision}
                      onChange={(event) =>
                        setEvaluationData((prev) => ({
                          ...prev,
                          supervision: event.target.value,
                        }))
                      }
                      placeholder="슈퍼비전 내용을 입력하세요"
                      className="min-h-[80px] resize-none"
                    />
                  ) : (
                    evaluationData.supervision || (
                      <span className="text-muted-foreground">내용 없음</span>
                    )
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 flex justify-center gap-4">
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditMode((prev) => !prev)}
            >
              <Pencil className="mr-2 size-4" />
              {isEditMode ? "저장" : "수정"}
            </Button>

            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 size-4" />
              인쇄
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="w-24 border border-gray-300 bg-gray-50 px-3 py-2 text-center">
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
    <td className={cn("border border-gray-300 px-3 py-2", className)}>
      {children}
    </td>
  )
}

function SimpleRow({
  label,
  value,
  primary,
}: {
  label: string
  value: string
  primary?: boolean
}) {
  return (
    <tr>
      <th className="w-32 whitespace-nowrap border border-gray-300 bg-gray-50 px-4 py-3 text-center">
        {label}
      </th>
      <td
        className={cn(
          "border border-gray-300 px-4 py-3",
          primary && "text-primary",
        )}
      >
        {value}
      </td>
    </tr>
  )
}