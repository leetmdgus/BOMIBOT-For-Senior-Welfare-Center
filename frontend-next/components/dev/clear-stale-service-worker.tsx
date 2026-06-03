"use client"

import { useEffect } from "react"

const SW_CLEARED_KEY = "bomi_sw_cleared_v1"

/**
 * 예전 v0 PWA Workbox가 API fetch(127.0.0.1:9001 등)를 가로채는 경우 제거.
 * React 19에서는 `<script>` / `next/script` 대신 마운트 시 실행합니다.
 */
export function ClearStaleServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length === 0) return

      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      )

      if ("caches" in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }

      if (!sessionStorage.getItem(SW_CLEARED_KEY)) {
        sessionStorage.setItem(SW_CLEARED_KEY, "1")
        location.reload()
        return
      }

      sessionStorage.removeItem(SW_CLEARED_KEY)
      console.info("[bomi] 예전 Service Worker(Workbox)를 제거했습니다.")
    })()
  }, [])

  return null
}
