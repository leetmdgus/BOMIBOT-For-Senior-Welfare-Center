"use client"

import { useEffect } from "react"

/** 헤더+탭 높이를 측정해 본문 툴바 sticky offset에 반영 */
export function TaskDetailToolbarOffset() {
  useEffect(() => {
    const chrome = document.getElementById("task-detail-sticky-chrome")
    const scroll = document.getElementById("task-detail-scroll")
    if (!chrome || !scroll) return

    const apply = () => {
      scroll.style.setProperty(
        "--task-detail-toolbar-offset",
        `${chrome.offsetHeight}px`,
      )
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(chrome)
    window.addEventListener("resize", apply)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", apply)
    }
  }, [])

  return null
}
