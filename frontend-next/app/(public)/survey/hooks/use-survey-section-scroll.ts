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
        // 실제 스크롤러는 <main>이 아니라 문서(body)이므로 root는 뷰포트(null)로 둔다.
        // <main>을 root로 쓰면 스크롤해도 교차 비율이 바뀌지 않아 활성 섹션이 고정된다.
        root: null,
        rootMargin: "-12% 0px -55% 0px",
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      }
    )

    sectionNodes.forEach((node) => observer.observe(node))

    return () => observer.disconnect()
  }, [scrollRoot, sectionCount])

  const scrollToSection = useCallback((sectionId: string) => {
    // 문서가 스크롤되므로 scrollRoot.scrollTo()는 동작하지 않는다.
    // 실제 스크롤러를 브라우저가 찾도록 scrollIntoView를 사용한다.
    // 각 섹션 div의 scroll-mt-6(=24px)로 상단 여백이 적용된다.
    const target = document.getElementById(sectionId)

    if (!target) return

    setActiveSectionId(sectionId)
    isProgrammaticScroll.current = true

    target.scrollIntoView({ behavior: "smooth", block: "start" })

    window.setTimeout(() => {
      isProgrammaticScroll.current = false
    }, 600)
  }, [])

  return { activeSectionId, scrollToSection }
}
