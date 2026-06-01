import type { TaskOption } from "@/components/files/file-types"
import { getCurrentYearString } from "@/lib/current-year"
import type { KanbanProject } from "@/services/kanban.board.types"

function stripScope(id: string): string {
  const index = id.indexOf(":")
  return index >= 0 ? id.slice(index + 1) : id
}

/** 칸반 사업·카테고리·업무(카드)를 파일 담당 업무 선택 목록으로 변환 */
export function buildTaskOptionsFromKanbanProjects(
  projects: KanbanProject[],
): TaskOption[] {
  const seen = new Set<string>()
  const options: TaskOption[] = []

  for (const project of projects) {
    for (const category of project.categories ?? []) {
      for (const task of category.tasks ?? []) {
        const rawId = task.id?.trim()
        if (!rawId) continue

        const id = stripScope(rawId)
        if (!id || seen.has(id)) continue
        seen.add(id)

        const name = task.title?.trim() || id
        options.push({ id, name })
      }
    }
  }

  return options.sort((a, b) => a.name.localeCompare(b.name, "ko"))
}

export async function loadKanbanTaskOptions(
  getProjects: (year: string) => Promise<KanbanProject[]>,
): Promise<TaskOption[]> {
  const year = getCurrentYearString()
  const years = Array.from(new Set([year, "2026", "2025", "2024"]))
  const batches = await Promise.all(years.map((y) => getProjects(y)))

  const merged: KanbanProject[] = []
  const seenProjectIds = new Set<string>()

  for (const projects of batches) {
    for (const project of projects) {
      const pid =
        project.id ?? `${project.year}-${project.number}-${project.title}`
      if (seenProjectIds.has(pid)) continue
      seenProjectIds.add(pid)
      merged.push(project)
    }
  }

  return buildTaskOptionsFromKanbanProjects(merged)
}
