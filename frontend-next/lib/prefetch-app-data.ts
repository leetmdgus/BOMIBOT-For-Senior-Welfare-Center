import { cachedApiGet } from "@/lib/api-get-cache"
import { getCurrentYearString } from "@/lib/current-year"
import { getDashboardOverview } from "@/services/dashboard.service"
import {
  getProjectImageOptions,
  getProjects,
  getStaffList,
} from "@/services/kanban.board.service"

/** 로그인 직후·대시보드 진입 전 백그라운드 프리로드 */
export function prefetchAppData(year: string = getCurrentYearString()): void {
  if (typeof window === "undefined") return

  void Promise.all([
    cachedApiGet("dashboard:overview", () => getDashboardOverview(), {
      ttlMs: 60_000,
    }),
    cachedApiGet(`kanban:boards:${year}`, () => getProjects(year)),
    cachedApiGet("kanban:staff", () => getStaffList(), { ttlMs: 120_000 }),
    cachedApiGet("kanban:project-images", () => getProjectImageOptions(), {
      ttlMs: 120_000,
    }),
  ]).catch(() => {
    /* 프리로드 실패는 무시 — 화면에서 재시도 */
  })
}
