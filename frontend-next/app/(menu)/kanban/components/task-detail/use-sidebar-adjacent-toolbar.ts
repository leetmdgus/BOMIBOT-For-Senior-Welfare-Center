"use client"

import { useEffect, useState } from "react"

export const RICH_TEXT_TOOLBAR_RAIL_WIDTH_PX = 240

export type SidebarAdjacentToolbarLayout = {
  left: number
  top: number
  width: number
  ready: boolean
}

/** 앱 사이드바 오른쪽에 붙는 세로 툴바 위치 */
export function useSidebarAdjacentToolbar(): SidebarAdjacentToolbarLayout {
  const [layout, setLayout] = useState<SidebarAdjacentToolbarLayout>({
    left: 0,
    top: 0,
    width: RICH_TEXT_TOOLBAR_RAIL_WIDTH_PX,
    ready: false,
  })

  useEffect(() => {
    const update = () => {
      const sidebar = document.querySelector<HTMLElement>("[data-app-sidebar]")
      const chrome = document.getElementById("task-detail-sticky-chrome")
      const sidebarRect = sidebar?.getBoundingClientRect()
      const chromeRect = chrome?.getBoundingClientRect()

      setLayout({
        left: sidebarRect?.right ?? 0,
        top: chromeRect?.bottom ?? 0,
        width: RICH_TEXT_TOOLBAR_RAIL_WIDTH_PX,
        ready: Boolean(sidebarRect && sidebarRect.width > 0),
      })
    }

    update()
    window.addEventListener("resize", update)

    const ro = new ResizeObserver(update)
    const sidebar = document.querySelector("[data-app-sidebar]")
    const chrome = document.getElementById("task-detail-sticky-chrome")
    if (sidebar) ro.observe(sidebar)
    if (chrome) ro.observe(chrome)

    return () => {
      window.removeEventListener("resize", update)
      ro.disconnect()
    }
  }, [])

  return layout
}
