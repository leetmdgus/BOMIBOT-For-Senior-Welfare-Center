import { isFastApiMode } from "@/lib/api-client"

/**
 * Mock vs FastAPI 선택.
 * - `NEXT_PUBLIC_USE_MOCK_API=true` → 항상 mock
 * - `false` → 항상 API
 * - 미설정 → API URL/프록시가 있으면 API, 없으면 mock
 */
export function shouldUseMockApi(): boolean {
  const flag = process.env.NEXT_PUBLIC_USE_MOCK_API
  if (flag === "true") return true
  if (flag === "false") return false
  return !isFastApiMode()
}
