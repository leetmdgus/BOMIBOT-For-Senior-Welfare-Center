"use client"

import { useState } from "react"
import { X, ChevronDown, ChevronUp, Search, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Staff {
  id: string
  name: string
  team: string
  position: string
}

interface SubProject {
  id: string
  name: string
  manager: Staff | null
  open: boolean
  searchQuery: string
}

interface ProjectFormData {
  projectName: string
  subProjects: SubProject[]
}

interface ProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: ProjectFormData) => void
}

const staffList: Staff[] = [
  { id: "1", name: "김태민", team: "복지 1팀", position: "사회복지사" },
  { id: "2", name: "이창환", team: "복지 1팀", position: "사회복지사" },
  { id: "3", name: "이승현", team: "복지 1팀", position: "사회복지사" },
]

const createSubProject = (index: number): SubProject => ({
  id: crypto.randomUUID(),
  name: "",
  manager: null,
  open: index === 2,
  searchQuery: "",
})

const initialFormData: ProjectFormData = {
  projectName: "",
  subProjects: [createSubProject(0), createSubProject(1), createSubProject(2)],
}

export function ProjectModal({
  open,
  onOpenChange,
  onSubmit,
}: ProjectModalProps) {
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData)

  const resetForm = () => {
    setFormData({
      projectName: "",
      subProjects: [
        createSubProject(0),
        createSubProject(1),
        createSubProject(2),
      ],
    })
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const updateSubProject = (
    id: string,
    patch: Partial<SubProject>
  ) => {
    setFormData((prev) => ({
      ...prev,
      subProjects: prev.subProjects.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }))
  }

  const addSubProject = () => {
    setFormData((prev) => ({
      ...prev,
      subProjects: [
        ...prev.subProjects,
        createSubProject(prev.subProjects.length),
      ],
    }))
  }

  const handleSubmit = () => {
    onSubmit?.(formData)
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-[760px] overflow-y-auto rounded-xl border-0 bg-muted p-0 shadow-2xl [&>button]:hidden">
        <DialogHeader className="relative px-10 pt-10">
          <DialogTitle className="text-center text-2xl font-medium">
            사업 수정
          </DialogTitle>

          <button
            type="button"
            onClick={handleClose}
            className="absolute right-6 top-6 bg-background px-3 py-2 text-2xl font-bold"
          >
            X
          </button>
        </DialogHeader>

        <div className="mx-auto w-full max-w-[520px] space-y-6 px-6 py-8">
          <div className="space-y-2">
            <label className="text-2xl font-medium">사업명</label>
            <Input
              placeholder="선택"
              value={formData.projectName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  projectName: e.target.value,
                })
              }
              className="h-10 border-0 bg-[#ddd] text-xl"
            />
          </div>

          {formData.subProjects.map((subProject, index) => {
            const filteredStaff = staffList.filter((staff) => {
              const keyword = subProject.searchQuery.trim()
              if (!keyword) return true

              return (
                staff.name.includes(keyword) ||
                staff.team.includes(keyword) ||
                staff.position.includes(keyword)
              )
            })

            return (
              <div key={subProject.id} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-2xl font-medium">
                    세부사업명{index + 1}
                  </label>

                  <Input
                    placeholder={index === 0 ? "입력필드" : ""}
                    value={subProject.name}
                    onChange={(e) =>
                      updateSubProject(subProject.id, {
                        name: e.target.value,
                      })
                    }
                    className="h-10 border-0 bg-[#ddd] text-xl"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateSubProject(subProject.id, {
                      open: !subProject.open,
                    })
                  }
                  className="flex w-full items-center justify-between border-b border-border pb-3 text-2xl font-medium"
                >
                  <span>담당자</span>
                  {subProject.open ? (
                    <ChevronUp className="size-6" />
                  ) : (
                    <ChevronDown className="size-6" />
                  )}
                </button>

                {subProject.open && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-h-[78px] rounded-sm bg-background p-3 shadow">
                      {subProject.manager ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="size-5 rounded-full bg-muted" />
                          <span>
                            {subProject.manager.team} {subProject.manager.name}{" "}
                            {subProject.manager.position}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateSubProject(subProject.id, {
                                manager: null,
                              })
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="검색 필드"
                          value={subProject.searchQuery}
                          onChange={(e) =>
                            updateSubProject(subProject.id, {
                              searchQuery: e.target.value,
                            })
                          }
                          className="h-10 border-0 bg-[#ddd] pl-9 text-lg"
                        />
                      </div>

                      <div className="max-h-[80px] overflow-y-auto rounded-sm bg-background shadow">
                        {filteredStaff.map((staff) => (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() =>
                              updateSubProject(subProject.id, {
                                manager: staff,
                              })
                            }
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                              subProject.manager?.id === staff.id && "bg-muted"
                            )}
                          >
                            <span className="size-5 rounded-full bg-muted" />
                            <span>
                              {staff.team} {staff.name} {staff.position}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex justify-center border-t border-border pt-0">
            <button
              type="button"
              onClick={addSubProject}
              className="-mt-5 flex size-10 items-center justify-center rounded-full bg-background shadow"
            >
              <Plus className="size-5" />
            </button>
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              onClick={handleSubmit}
              className="h-10 w-40 bg-[#ddd] text-lg text-foreground hover:bg-[#d0d0d0]"
            >
              완료
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}