"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles } from "lucide-react"

import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"
import {
  createTask,
  getProjects,
  updateProject,
} from "@/services/kanban.board.service"
import {
  KanbanProject,
  ProjectEditFormData,
  Task,
} from "@/services/kanban.board.types"
import { TaskFormData, TaskModal } from "@/components/kanban/board/task-modal"
import { ProjectEditModal } from "@/components/kanban/board/project-edit-modal"
import { SubHeader } from "@/components/kanban/board/subheader"
import { ProjectSection } from "@/components/kanban/board/project-section"

export default function Kanban() {
  const [year, setYear] = useState("2026")
  const [projects, setProjects] = useState<KanbanProject[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [taskModalOpen, setTaskModalOpen] = useState(false)
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

  const normalizeTask = (task: Partial<Task>): Task => ({
    id: task.id ?? crypto.randomUUID(),
    title: task.title ?? "",
    description: task.description ?? "",
    assignee: task.assignee ?? "",
    completedCount: task.completedCount ?? 0,
    totalCount: task.totalCount ?? 0,
  })

  const handleCreateProject = async (data: TaskFormData) => {
    console.log("프로젝트 생성:", data)
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
      completedCount: 0,
      totalCount: 0,
    })

    await refreshProjects()
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />

          <SubHeader
            year={year}
            onYearChange={setYear}
            onCreateProject={handleCreateProject}
          />

          <main className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">
                데이터를 불러오는 중입니다.
              </div>
            ) : (
              <div className="space-y-6">
                {projects.map((project) => (
                  <ProjectSection
                    key={project.id}
                    project={{
                      ...project,
                      categories: project.categories.map((category) => ({
                        ...category,
                        tasks: category.tasks.map(normalizeTask),
                      })),
                    }}
                    onRefresh={refreshProjects}
                    onCreateTask={handleCreateTask}
                    onEditProject={() => handleOpenEditProject(project)}
                  />
                ))}
              </div>
            )}
          </main>

          <button
            type="button"
            onClick={() => setTaskModalOpen(true)}
            className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
            aria-label="업무 추가"
          >
            <Sparkles className="size-6" />
          </button>
        </div>
      </div>

      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        formType="task"
        columnType="실적관리"
        onSubmit={async () => {
          setTaskModalOpen(false)
        }}
      />

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
          onSubmit={handleEditProject}
        />
      )}
    </div>
  )
}