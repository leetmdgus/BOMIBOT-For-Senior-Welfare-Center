"use client"

import { useEffect } from "react"

/**
 * 예전 PWA/Workbox SW가 localhost API(127.0.0.1:8020) 요청을 가로채는 경우 제거.
 * 개발 환경에서만 실행합니다.
 */
export function ClearStaleServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length === 0) return

      await Promise.all(registrations.map((registration) => registration.unregister()))

      if ("caches" in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }

      console.info(
        "[bomi] 예전 Service Worker(Workbox)를 제거했습니다.",
      )
    })()
  }, [])

  return null
}
