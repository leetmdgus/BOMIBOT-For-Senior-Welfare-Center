"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const SECTION_PREFIX = "survey-section-"
const QUESTION_PREFIX = "survey-question-"

export function surveySectionId(key: "overview" | "basic") {
  return `${SECTION_PREFIX}${key}`
}

export function surveyQuestionSectionId(questionId: string) {
  return `${QUESTION_PREFIX}${questionId}`
}

export function useSurveySectionScroll(
  scrollRoot: HTMLElement | null,
  sectionCount = 0
) {
  const [activeSectionId, setActiveSectionId] = useState<string>(
    surveySectionId("overview")
  )
  const isProgrammaticScroll = useRef(false)

  useEffect(() => {
    if (!scrollRoot) return

    const sectionNodes = Array.from(
      scrollRoot.querySelectorAll<HTMLElement>(
        `[id^="${SECTION_PREFIX}"], [id^="${QUESTION_PREFIX}"]`
      )
    )

    if (sectionNodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        const topMost = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.target.getBoundingClientRect().top -
              b.target.getBoundingClientRect().top
          )[0]

        const picked = topMost ?? visible[0]

        if (picked?.target.id) {
          setActiveSectionId(picked.target.id)
        }
      },
      {
        root: scrollRoot,
        rootMargin: "-12% 0px -55% 0px",
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      }
    )

    sectionNodes.forEach((node) => observer.observe(node))

    return () => observer.disconnect()
  }, [scrollRoot, sectionCount])

  const scrollToSection = useCallback(
    (sectionId: string) => {
      const target = scrollRoot?.querySelector<HTMLElement>(`#${sectionId}`)

      if (!target || !scrollRoot) return

      setActiveSectionId(sectionId)
      isProgrammaticScroll.current = true

      const rootTop = scrollRoot.getBoundingClientRect().top
      const targetTop = target.getBoundingClientRect().top
      const nextTop =
        scrollRoot.scrollTop + (targetTop - rootTop) - 16

      scrollRoot.scrollTo({ top: nextTop, behavior: "smooth" })

      window.setTimeout(() => {
        isProgrammaticScroll.current = false
      }, 600)
    },
    [scrollRoot]
  )

  return { activeSectionId, scrollToSection }
}
