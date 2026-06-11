"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

import {
  useDocuments,
  type DocumentsView,
} from "./documents-provider"

const validTabs: DocumentsView[] = [
  "performance",
  "budget",
  "business-plan",
]

export function DocumentsTabSync() {
  const searchParams = useSearchParams()
  const { setActiveView } = useDocuments()

  useEffect(() => {
    const tab = searchParams.get("tab")

    if (tab && validTabs.includes(tab as DocumentsView)) {
      setActiveView(tab as DocumentsView)
    }
  }, [searchParams, setActiveView])

  return null
}
