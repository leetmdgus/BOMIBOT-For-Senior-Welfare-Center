"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  ChevronDown,
  ChevronUp,
  List,
  Pencil,
  Printer,
  Upload,
  X,
} from "lucide-react"

import { PrintArea } from "@/components/common/print-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  getBusinessPlan,
  saveBusinessPlan,
} from "@/services/kanban.task-detail.service"
import type {
  BusinessPlanFormData,
  BusinessPlanSection,
} from "@/services/kanban.task-detail.types"

const emptyFormData: BusinessPlanFormData = {
  projectName: "",
  purpose: "",
  goals: [],
  period: "",
  target: "",
  totalCount: "",
  budget: "",
  budgetCategory: "",
  manager: "",
  subProjects: [],
}

export function BusinessPlanTab() {
  const params = useParams()
  const taskId = typeof params.id === "string" ? params.id : ""

  const [isLoading, setIsLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [sections, setSections] = useState<BusinessPlanSection[]>([])
  const [formData, setFormData] = useState<BusinessPlanFormData>(emptyFormData)

  useEffect(() => {
    if (!taskId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    getBusinessPlan(taskId)
      .then((document) => {
        setFormData(document.formData)
        setSections(document.sections)
      })
      .catch((error) => {
        console.error("사업계획서 로드 실패:", error)
      })
      .finally(() => setIsLoading(false))
  }, [taskId])

  const handleEditToggle = async () => {
    if (isEditMode && taskId) {
      try {
        const saved = await saveBusinessPlan(taskId, { formData, sections })
        setFormData(saved.formData)
        setSections(saved.sections)
      } catch (error) {
        console.error("사업계획서 저장 실패:", error)
      }
    }

    setIsEditMode((prev) => !prev)
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    const nextSections = [...sections]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= sections.length) return

    ;[nextSections[index], nextSections[targetIndex]] = [
      nextSections[targetIndex],
      nextSections[index],
    ]

    setSections(nextSections)
  }

  const deleteSection = (index: number) => {
    setSections(sections.filter((_, sectionIndex) => sectionIndex !== index))
  }

  if (isLoading) {
    return (
      <p className="py-24 text-center text-sm text-muted-foreground">
        사업계획서를 불러오는 중입니다.
      </p>
    )
  }

  if (isEditMode) {
    return (
      <div className="flex gap-6">
        <PrintArea className="flex-1">
          <BusinessPlanTopTitle title="사업계획서" />

          <div className="rounded-xl border border-border bg-white shadow-sm">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className="flex items-start border-b border-gray-200 last:border-b-0"
              >
                <div className="flex-1 p-4">
                  {section.type === "file" && (
                    <div className="flex items-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                      <Button variant="outline" size="sm">
                        <Upload className="mr-2 size-4" />
                        사진 및 파일 첨부
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        여기에 파일을 끌어 놓거나 왼쪽의 버튼을 클릭하세요.
                      </span>
                    </div>
                  )}

                  {section.type === "heading" && (
                    <h3 className="py-2 text-lg font-semibold">
                      {section.title}
                    </h3>
                  )}

                  {section.type === "table" && (
                    <div>
                      <EditorToolbar />

                      <div className="rounded-b-lg border border-t-0 border-gray-200 p-4">
                        <h4 className="mb-4 font-medium">{section.title}</h4>

                        <table className="w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-blue-50">
                              <th
                                className="border border-gray-300 px-4 py-2 text-center"
                                rowSpan={2}
                              >
                                목적
                              </th>
                              <th
                                className="border border-gray-300 px-4 py-2 text-center"
                                colSpan={2}
                              >
                                목표
                              </th>
                            </tr>
                            <tr className="bg-blue-50">
                              <th className="border border-gray-300 px-4 py-2 text-center">
                                산출목표
                              </th>
                              <th className="border border-gray-300 px-4 py-2 text-center">
                                성과목표
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {formData.subProjects.map((subProject, subIndex) => (
                              <tr key={subProject.name}>
                                {subIndex === 0 && (
                                  <td
                                    className="border border-gray-300 px-4 py-2 align-top text-primary"
                                    rowSpan={formData.subProjects.length}
                                  >
                                    <Textarea
                                      value={formData.purpose}
                                      onChange={(event) =>
                                        setFormData({
                                          ...formData,
                                          purpose: event.target.value,
                                        })
                                      }
                                      className="min-h-[120px] resize-none"
                                    />
                                  </td>
                                )}

                                <td className="whitespace-pre-line border border-gray-300 px-4 py-2 text-primary">
                                  <Textarea
                                    value={subProject.output}
                                    onChange={(event) => {
                                      const nextSubProjects = [
                                        ...formData.subProjects,
                                      ]
                                      nextSubProjects[subIndex].output =
                                        event.target.value

                                      setFormData({
                                        ...formData,
                                        subProjects: nextSubProjects,
                                      })
                                    }}
                                    className="min-h-[80px] resize-none"
                                  />
                                </td>

                                <td className="border border-gray-300 px-4 py-2">
                                  <Textarea
                                    value={subProject.outcome}
                                    onChange={(event) => {
                                      const nextSubProjects = [
                                        ...formData.subProjects,
                                      ]
                                      nextSubProjects[subIndex].outcome =
                                        event.target.value

                                      setFormData({
                                        ...formData,
                                        subProjects: nextSubProjects,
                                      })
                                    }}
                                    className="min-h-[80px] resize-none"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <SectionControls
                  index={index}
                  onMove={moveSection}
                  onDelete={deleteSection}
                />
              </div>
            ))}
          </div>
        </PrintArea>

        <BusinessPlanActions editMode onEdit={() => void handleEditToggle()} />
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      <PrintArea className="flex-1">
        <BusinessPlanTopTitle title="사업계획서" />

        <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-center text-lg font-semibold">
            일반상담 및 정보제공사업 단위사업계획서
          </h2>

          <table className="w-full border-collapse border border-gray-300 text-sm">
            <tbody>
              <InfoRow label="사 업 명" value={formData.projectName} />
              <InfoRow label="목 적" value={formData.purpose} primary />
              <tr>
                <th className="w-36 whitespace-nowrap border border-gray-300 bg-gray-50 px-4 py-3 text-center">
                  목 표
                </th>
                <td className="border border-gray-300 px-4 py-3">
                  <ul className="list-disc space-y-1 pl-5">
                    {formData.goals.map((goal) => (
                      <li key={goal}>{goal}</li>
                    ))}
                  </ul>
                </td>
              </tr>
              <InfoRow label="사 업 기 간" value={formData.period} />
              <InfoRow label="사 업 대 상" value={formData.target} />
              <InfoRow label="연 인 원 수 / 횟 수" value={formData.totalCount} />
              <InfoRow label="소 요 예 산" value={formData.budget} />
              <InfoRow label="예 산 과 목" value={formData.budgetCategory} primary />
              <InfoRow label="담 당" value={formData.manager} primary />
            </tbody>
          </table>

          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold">
              I. 사업의 배경 및 필요성
            </h3>

            <div className="space-y-4 text-sm leading-relaxed">
              <div>
                <h4 className="mb-2 font-medium">1. 대상자 욕구 및 문제점</h4>
                <p className="text-muted-foreground">
                  통계청의 고령자 통계에 따르면 고령화 대응의 필요성이 더욱
                  증가할 것으로 예상된다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PrintArea>

      <BusinessPlanActions onEdit={() => void handleEditToggle()} />
    </div>
  )
}

function BusinessPlanTopTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
    </div>
  )
}

function InfoRow({
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
      <th className="w-36 whitespace-nowrap border border-gray-300 bg-gray-50 px-4 py-3 text-center">
        {label}
      </th>
      <td className={`border border-gray-300 px-4 py-3 ${primary ? "text-primary" : ""}`}>
        {value}
      </td>
    </tr>
  )
}

function BusinessPlanActions({
  editMode,
  onEdit,
}: {
  editMode?: boolean
  onEdit: () => void
}) {
  return (
    <div className="print-hide flex flex-col gap-2 pt-12">
      <Button variant="outline" className="justify-start">
        <List className="mr-2 size-4" />
        목록
      </Button>

      <Button
        type="button"
        variant="outline"
        className="justify-start"
        onClick={() => window.print()}
      >
        <Printer className="mr-2 size-4" />
        인쇄
      </Button>

      <Button className="justify-start bg-primary" onClick={onEdit}>
        <Pencil className="mr-2 size-4" />
        {editMode ? "저장" : "수정"}
      </Button>

      <Button
        variant="outline"
        className="justify-start border-destructive text-destructive hover:bg-destructive/10"
      >
        <X className="mr-2 size-4" />
        닫기
      </Button>
    </div>
  )
}

function EditorToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border-b border-gray-200 bg-gray-50 p-2">
      {["↶", "↷", "B", "I", "U", "S", "1.", "•"].map((item) => (
        <Button key={item} variant="ghost" size="sm" className="h-8 px-2">
          {item}
        </Button>
      ))}
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
  onDelete: (index: number) => void
}) {
  return (
    <div className="ml-2 flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="size-6 p-0"
        onClick={() => onMove(index, "up")}
      >
        <ChevronUp className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="size-6 p-0"
        onClick={() => onMove(index, "down")}
      >
        <ChevronDown className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="size-6 p-0 text-destructive hover:text-destructive"
        onClick={() => onDelete(index)}
      >
        삭제
      </Button>
    </div>
  )
}