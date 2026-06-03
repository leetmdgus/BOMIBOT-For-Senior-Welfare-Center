import { shouldUseMockApi } from "@/lib/api-service-mode"
import { cachedApiGet } from "@/lib/api-get-cache"
import { getCurrentYearString } from "@/lib/current-year"
import { loadAssignableStaff } from "@/lib/kanban/assignable-staff"
import { getDashboardOverview } from "@/services/dashboard.service"
import {
  getProjectImageOptions,
  getProjects,
} from "@/services/kanban.board.service"

/** 로그인 직후·대시보드 진입 전 백그라운드 프리로드 */
export function prefetchAppData(year: string = getCurrentYearString()): void {
  if (typeof window === "undefined") return
  if (shouldUseMockApi()) return

  void Promise.all([
    cachedApiGet(`dashboard:overview:${year}`, () => getDashboardOverview(year), {
      ttlMs: 60_000,
    }),
    cachedApiGet(`kanban:boards:${year}`, () => getProjects(year)),
    cachedApiGet("kanban:staff", () => loadAssignableStaff(), { ttlMs: 120_000 }),
    cachedApiGet("kanban:project-images", () => getProjectImageOptions(), {
      ttlMs: 120_000,
    }),
  ]).catch(() => {
    /* 프리로드 실패는 무시 — 화면에서 재시도 */
  })
}
