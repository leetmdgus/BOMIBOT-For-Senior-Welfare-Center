"use client"

import { useEffect, useState } from "react"
import { Radio } from "lucide-react"

interface CollaborationLiveNoticeProps {
  message: string | null
}

export function CollaborationLiveNotice({ message }: CollaborationLiveNoticeProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(timer)
  }, [message])

  if (!visible || !message) return null

  return (
    <div className="print-hide fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg">
      <Radio className="size-4 shrink-0 animate-pulse text-primary" />
      <span>{message}</span>
    </div>
  )
}
