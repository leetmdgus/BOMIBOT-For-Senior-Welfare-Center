import type { KanbanProject, Task } from "@/services/kanban.board.types"

function normalizeQuery(query: string) {
  return query.trim().toLowerCase()
}

function matchesProjectName(project: KanbanProject, query: string) {
  const fields = [project.title, project.number, project.team, project.manager]

  return fields.some((field) => field?.toLowerCase().includes(query))
}

function matchesTaskAssignee(task: Task, query: string) {
  return (task.assignee ?? "").toLowerCase().includes(query)
}

/** 사업명(프로젝트) 일치 시 해당 사업 전체 카드, 담당자 일치 시 해당 담당자 카드만 */
export function filterKanbanProjects(
  projects: KanbanProject[],
  rawQuery: string,
): KanbanProject[] {
  const query = normalizeQuery(rawQuery)
  if (!query) return projects

  const results: KanbanProject[] = []

  for (const project of projects) {
    const nameMatched = matchesProjectName(project, query)

    const filteredCategories = project.categories
      .map((category) => ({
        ...category,
        tasks: category.tasks.filter(
          (task) => nameMatched || matchesTaskAssignee(task, query),
        ),
      }))
      .filter((category) => category.tasks.length > 0)

    if (filteredCategories.length > 0) {
      results.push({ ...project, categories: filteredCategories })
    }
  }

  return results
}

export function countKanbanTasks(projects: KanbanProject[]) {
  return projects.reduce(
    (sum, project) =>
      sum +
      project.categories.reduce(
        (categorySum, category) => categorySum + category.tasks.length,
        0,
      ),
    0,
  )
}
