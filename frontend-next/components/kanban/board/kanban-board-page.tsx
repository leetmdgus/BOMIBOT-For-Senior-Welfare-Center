"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Briefcase, Search } from "lucide-react"

import { Sidebar } from "@/components/common/sidebar"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Header } from "@/components/common/header"
import type { TaskFormData } from "@/components/kanban/board/task-modal"
import { ProjectEditModal } from "@/components/kanban/board/project-edit-modal"
import { SubHeader } from "@/components/kanban/board/subheader"
import { ProjectSection } from "@/components/kanban/board/project-section"

import {
  createProject,
  createTask,
  getProjectImageOptions,
  getProjects,
  getStaffList,
  updateProject,
} from "@/services/kanban.board.service"
import {
  filterKanbanProjects,
} from "@/lib/kanban/filter-kanban-projects"
import {
  CreateProjectRequest,
  KanbanProject,
  ProjectEditFormData,
  ProjectImageOption,
  Staff,
  Task,
} from "@/services/kanban.board.types"


export function KanbanBoardPage() {
  const [year, setYear] = useState("2026")
  const [projects, setProjects] = useState<KanbanProject[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [projectImages, setProjectImages] = useState<ProjectImageOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<KanbanProject | null>(
    null
  )

  const refreshProjects = useCallback(async () => {
    setIsLoading(true)

    try {
      const newProjects = await getProjects(year)
      setProjects(newProjects)
    } finally {
      setIsLoading(false)
    }
  }, [year])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  useEffect(() => {
    setSearchQuery("")
  }, [year])

  const filteredProjects = useMemo(
    () => filterKanbanProjects(projects, searchQuery),
    [projects, searchQuery],
  )

  const hasSearchQuery = searchQuery.trim().length > 0

  useEffect(() => {
    const loadSharedModalData = async () => {
      const [staff, images] = await Promise.all([
        getStaffList(),
        getProjectImageOptions(),
      ])

      setStaffList(staff)
      setProjectImages(images)
    }

    loadSharedModalData().catch((error) => {
      console.error("공통 모달 데이터 로드 실패:", error)
    })
  }, [])

  const normalizeTask = (task: Partial<Task>): Task => ({
    id: task.id ?? crypto.randomUUID(),
    title: task.title ?? "",
    description: task.description ?? "",
    assignee: task.assignee ?? "",
  })

  const handleCreateProject = async (data: TaskFormData) => {
    const payload: CreateProjectRequest = {
      assignees: data.assignees ?? [],
      description: data.description ?? "",
      project_image: data.projectImage,
      project_name: data.projectName,
      title: data.title?.trim() || data.projectName,
      year,
    }

    await createProject(payload)
    await refreshProjects()
  }

  const handleOpenEditProject = (project: KanbanProject) => {
    setSelectedProject(project)
    setEditModalOpen(true)
  }

  const handleEditProject = async (data: ProjectEditFormData) => {
    if (!selectedProject) return

    await updateProject(selectedProject.id, {
      title: data.title,
      image: data.imagePreview,
    })

    setEditModalOpen(false)
    setSelectedProject(null)

    await refreshProjects()
  }

  const handleCreateTask = async (
    projectId: string,
    categoryId: string,
    data: TaskFormData
  ) => {
    await createTask(projectId, categoryId, {
      title: data.title,
      description: data.description ?? "",
      assignee: data.assignees?.[0]?.name ?? "",
    })

    await refreshProjects()
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header kanbanYear={year} />

          <SubHeader
            year={year}
            onYearChange={setYear}
            onCreateProject={handleCreateProject}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            staffList={staffList}
            projectImages={projectImages}
          />

          <main className="kanban-board-main flex-1 cursor-default overflow-y-auto p-6">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">
                데이터를 불러오는 중입니다.
              </div>
            ) : projects.length === 0 ? (
              <Empty className="min-h-[min(480px,60vh)] border border-dashed border-border bg-card/50">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Briefcase className="size-6 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle>사업이 없습니다.</EmptyTitle>
                  <EmptyDescription>
                    {year}년 칸반 보드에 등록된 사업이 없습니다. 상단의
                    신규사업등록으로 첫 사업을 추가해 보세요.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : filteredProjects.length === 0 ? (
              <Empty className="min-h-[min(480px,60vh)] border border-dashed border-border bg-card/50">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Search className="size-6 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle>검색 결과가 없습니다</EmptyTitle>
                  <EmptyDescription>
                    「{searchQuery.trim()}」에 맞는 사업명·담당자 카드를 찾지
                    못했습니다. 다른 검색어를 입력해 보세요.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-6">
                {hasSearchQuery ? (
                  <p className="text-sm text-muted-foreground">
                    「{searchQuery.trim()}」 검색 — 사업{" "}
                    {filteredProjects.length}개
                  </p>
                ) : null}
                {filteredProjects.map((project) => (
                  <ProjectSection
                    key={project.id}
                    project={{
                      ...project,
                      categories: project.categories.map((category) => ({
                        ...category,
                        tasks: category.tasks.map(normalizeTask),
                      })),
                    }}
                    year={year}
                    staffList={staffList}
                    projectImages={projectImages}
                    onRefresh={refreshProjects}
                    onCreateTask={handleCreateTask}
                    onEditProject={() => handleOpenEditProject(project)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedProject && (
        <ProjectEditModal
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open)

            if (!open) {
              setSelectedProject(null)
            }
          }}
          project={{
            id: selectedProject.id,
            title: selectedProject.title,
            image: selectedProject.image,
          }}
          projectImages={projectImages}
          onSubmit={handleEditProject}
        />
      )}
    </div>
  )
}