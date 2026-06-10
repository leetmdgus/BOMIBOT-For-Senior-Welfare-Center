"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Briefcase, Loader2, RefreshCw, Search } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { CollaborationLiveNotice } from "@/components/collaboration/collaboration-live-notice"
import { CollaborationPresenceBar } from "@/components/collaboration/collaboration-presence-bar"
import { Sidebar } from "@/components/common/sidebar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
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
  formatTaskAssigneeField,
  loadAssignableStaff,
} from "@/lib/kanban/assignable-staff"
import {
  createProject,
  createTask,
  getProjectImageOptions,
  getProjects,
  updateProject,
} from "@/services/kanban.board.service"
import {
  filterKanbanProjects,
} from "@/lib/kanban/filter-kanban-projects"
import { resolveKanbanProjectAccessScope } from "@/lib/kanban/project-access"
import {
  CreateProjectRequest,
  KanbanProject,
  ProjectEditFormData,
  ProjectImageOption,
  Staff,
  Task,
} from "@/services/kanban.board.types"
import type { CollaborationMessage } from "@/lib/collaboration/types"
import { invalidateApiGetCache } from "@/lib/api-get-cache"
import { kanbanRoom } from "@/lib/collaboration/rooms"
import { useCollaborationRoom } from "@/lib/collaboration/use-collaboration-room"
import { isCollaborationAvailable } from "@/lib/collaboration/ws-url"
import { getCurrentYearString } from "@/lib/current-year"

/** 사업관리 보드 필터(연도·검색어)를 세션 동안 유지 — 페이지 이동 후 복원 */
const KANBAN_FILTER_KEY = "bomibot:kanban-board-filter"

/** 보드 데이터 로딩 최대 대기(ms) — 초과 시 무한 스피너 대신 에러로 전환. */
const BOARD_LOAD_TIMEOUT_MS = 20_000

/**
 * fetch가 영영 돌아오지 않는 경우(예: 예전 Service Worker가 API 요청을 가로채는 콜드 진입)
 * 스피너가 무한히 도는 것을 막기 위해, 일정 시간 후 거부하는 타임아웃을 건다.
 * 원본 fetch는 그대로 진행되어 캐시를 채울 수 있다(무해).
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}


export function KanbanBoardPage() {
  const { session } = useAuth()
  const [year, setYear] = useState(() => getCurrentYearString())
  const [liveNotice, setLiveNotice] = useState<string | null>(null)
  const clientIdRef = useRef<string | null>(null)
  const [projects, setProjects] = useState<KanbanProject[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [projectImages, setProjectImages] = useState<ProjectImageOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  // 저장 effect의 첫 실행(마운트)은 건너뛴다 — 복원 전 기본값으로 덮어쓰지 않도록.
  const filterSaveReadyRef = useRef(false)

  // 마운트 시 직전 세션의 필터(연도·검색어) 복원. (SSR/하이드레이션 안전하게 마운트 후)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KANBAN_FILTER_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as {
          year?: string
          searchQuery?: string
        }
        if (typeof parsed.year === "string" && parsed.year) setYear(parsed.year)
        if (typeof parsed.searchQuery === "string")
          setSearchQuery(parsed.searchQuery)
      }
    } catch {
      // sessionStorage 접근 불가 시 무시
    }
  }, [])

  // 필터 변경 시 저장. 첫 실행(마운트)은 스킵해 복원 전 기본값 저장을 막는다.
  useEffect(() => {
    if (!filterSaveReadyRef.current) {
      filterSaveReadyRef.current = true
      return
    }
    try {
      sessionStorage.setItem(
        KANBAN_FILTER_KEY,
        JSON.stringify({ year, searchQuery }),
      )
    } catch {
      // 무시
    }
  }, [year, searchQuery])

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<KanbanProject | null>(
    null
  )

  const loadBoardData = useCallback(
    async (options?: { projectsOnly?: boolean; silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true)
        setLoadError(null)
      }
      try {
        if (options?.projectsOnly) {
          const newProjects = await getProjects(year)
          setProjects(newProjects)
          return
        }
        // 조직 컨텍스트(권한 필터용)를 boards와 동시에 선발사 → getProjects 내부 필터가 캐시로 소비.
        // admin은 내부에서 bypass라 네트워크 호출 없음.
        void resolveKanbanProjectAccessScope().catch(() => {})
        // 스피너는 "사업 카드(boards+권한필터)"에만 묶는다. 직원·이미지 옵션은 보드 표시를
        // 막지 않도록 비차단 백그라운드 로드 — 콜드 진입 시 "가장 느린 호출"에 전체가 멈추던 문제 해소.
        const newProjects = await withTimeout(
          getProjects(year),
          BOARD_LOAD_TIMEOUT_MS,
          "보드 데이터를 시간 내에 불러오지 못했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.",
        )
        setProjects(newProjects)
        setHasLoadedOnce(true)
        void loadAssignableStaff()
          .then(setStaffList)
          .catch(() => {})
        void getProjectImageOptions()
          .then(setProjectImages)
          .catch(() => {})
      } catch (error) {
        if (!options?.silent) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "보드 데이터를 불러오지 못했습니다.",
          )
        }
      } finally {
        if (!options?.silent) {
          setIsLoading(false)
        }
      }
    },
    [year],
  )

  const refreshProjects = useCallback(async () => {
    invalidateApiGetCache("kanban")
    await loadBoardData({ projectsOnly: true })
  }, [loadBoardData])

  /** 카드 이동 등 — 로딩 스피너 없이 서버와 맞춤 */
  const refreshProjectsSilent = useCallback(async () => {
    invalidateApiGetCache("kanban")
    await loadBoardData({ projectsOnly: true, silent: true })
  }, [loadBoardData])

  const patchProjectCategories = useCallback(
    (projectId: string, categories: KanbanProject["categories"]) => {
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId ? { ...project, categories } : project,
        ),
      )
    },
    [],
  )

  const collaborationRoom =
    session?.regionId ? kanbanRoom(session.regionId, year) : null

  const handleCollaborationMessage = useCallback(
    (message: CollaborationMessage) => {
      if (!message.clientId || message.clientId === clientIdRef.current) return
      if (message.type === "kanban.refresh") {
        invalidateApiGetCache("kanban")
        void refreshProjects()
        if (message.userName) {
          const action = message.payload?.action as string | undefined
          const label =
            action === "move_task"
              ? "카드를 이동했습니다"
              : action === "update_task"
                ? "업무를 수정했습니다"
                : "칸반을 변경했습니다"
          setLiveNotice(`${message.userName}님이 ${label}`)
        }
      }
    },
    [refreshProjects],
  )

  const { clientId, presence, isConnected } = useCollaborationRoom(
    collaborationRoom,
    {
      enabled: isCollaborationAvailable(),
      onMessage: handleCollaborationMessage,
    },
  )

  useEffect(() => {
    clientIdRef.current = clientId
  }, [clientId])

  useEffect(() => {
    void loadBoardData()
  }, [loadBoardData])

  useEffect(() => {
    const onVersionRestored = () => {
      void refreshProjects()
    }
    window.addEventListener("kanban-version-restored", onVersionRestored)
    return () => window.removeEventListener("kanban-version-restored", onVersionRestored)
  }, [refreshProjects])

  useEffect(() => {
    setSearchQuery("")
  }, [year])

  const filteredProjects = useMemo(
    () => filterKanbanProjects(projects, searchQuery),
    [projects, searchQuery],
  )

  const hasSearchQuery = searchQuery.trim().length > 0

  const normalizeTask = (task: Partial<Task>): Task => ({
    id: task.id?.trim() ?? "",
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
      assignee: formatTaskAssigneeField(data.assignees),
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
            <CollaborationPresenceBar
              presence={presence}
              isConnected={isConnected}
              className="mb-4"
            />
            <CollaborationLiveNotice message={liveNotice} />
            {isLoading && !hasLoadedOnce && projects.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                데이터를 불러오는 중입니다.
              </div>
            ) : loadError && projects.length === 0 ? (
              <Empty className="min-h-[min(480px,60vh)] border border-dashed border-destructive/40 bg-card/50">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <AlertTriangle className="size-6 text-destructive" />
                  </EmptyMedia>
                  <EmptyTitle>보드를 불러오지 못했습니다</EmptyTitle>
                  <EmptyDescription>{loadError}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadBoardData()}
                    disabled={isLoading}
                  >
                    <RefreshCw className="size-4" />
                    다시 시도
                  </Button>
                </EmptyContent>
              </Empty>
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
              <div className="relative space-y-6">
                {isLoading ? (
                  <div className="flex items-center gap-2 rounded-md border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
                    <Loader2 className="size-3.5 animate-spin" />
                    보드 새로고침 중…
                  </div>
                ) : null}
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
                        tasks: category.tasks
                          .map(normalizeTask)
                          .filter((task) => task.id.length > 0),
                      })),
                    }}
                    year={year}
                    staffList={staffList}
                    projectImages={projectImages}
                    onRefresh={refreshProjects}
                    onRefreshSilent={refreshProjectsSilent}
                    onProjectCategoriesChange={patchProjectCategories}
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