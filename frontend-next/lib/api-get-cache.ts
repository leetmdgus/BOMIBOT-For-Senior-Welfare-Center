import { getClientSession } from "@/lib/auth/session"

type CacheEntry = {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

function scopeKey(): string {
  const session = getClientSession()
  return `${session?.regionId ?? "anon"}:${session?.token?.slice(-12) ?? "guest"}`
}

export type CachedGetOptions = {
  /** 캐시 키 (미지정 시 path) */
  key?: string
  /** TTL ms (기본 45초) */
  ttlMs?: number
}

/**
 * 동일 GET 요청 중복·짧은 TTL 캐시 (탭 전환·재방문 속도 개선).
 * POST/PATCH/DELETE 후에는 invalidateApiGetCache 로 무효화.
 */
export async function cachedApiGet<T>(
  path: string,
  fetcher: () => Promise<T>,
  options: CachedGetOptions = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? 45_000
  const cacheKey = `${scopeKey()}:${options.key ?? path}`
  const now = Date.now()

  const hit = cache.get(cacheKey)
  if (hit && hit.expiresAt > now) {
    return hit.data as T
  }

  const pending = inflight.get(cacheKey)
  if (pending) {
    return pending as Promise<T>
  }

  const request = fetcher()
    .then((data) => {
      cache.set(cacheKey, { data, expiresAt: now + ttlMs })
      inflight.delete(cacheKey)
      return data
    })
    .catch((error) => {
      inflight.delete(cacheKey)
      throw error
    })

  inflight.set(cacheKey, request)
  return request
}

/** path/키 일부 문자열이 포함된 캐시 항목 제거 */
export function invalidateApiGetCache(matcher?: string): void {
  const prefix = matcher ? `${scopeKey()}:${matcher}` : `${scopeKey()}:`
  for (const key of cache.keys()) {
    if (key.startsWith(prefix) || (matcher && key.includes(matcher))) {
      cache.delete(key)
    }
  }
}

export function clearApiGetCache(): void {
  cache.clear()
  inflight.clear()
}
