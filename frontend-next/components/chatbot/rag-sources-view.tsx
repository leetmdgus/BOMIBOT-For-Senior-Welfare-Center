"use client"

import type { AssistantRagCitation } from "@/services/chat.types"
import { cn } from "@/lib/utils"

const SOURCE_LABELS: Record<string, string> = {
  rag: "RAG",
  performance: "실적",
  dashboard: "대시보드",
  kanban: "칸반",
  organization: "조직",
  ebooks: "전자책",
  survey: "설문",
  aggregate: "통합",
  help: "도움말",
}

type Props = {
  citations: AssistantRagCitation[]
  className?: string
  maxHeight?: number
}

export function RagSourcesView({
  citations,
  className,
  maxHeight = 160,
}: Props) {
  if (citations.length === 0) return null

  return (
    <div
      className={cn(
        "mt-2 overflow-y-auto rounded-md border border-slate-200/80 bg-background/60 p-2",
        className,
      )}
      style={{ maxHeight }}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        RAG 검색 근거
      </p>
      <ul className="space-y-1.5">
        {citations.map((item, index) => (
          <li
            key={item.id}
            className="rounded border border-slate-100 bg-white/80 px-2 py-1.5 text-[11px] leading-snug"
          >
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-medium text-slate-700">
                {index + 1}. {item.title}
              </span>
              <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-muted-foreground">
                {SOURCE_LABELS[item.source] ?? item.source}
              </span>
              {typeof item.score === "number" && item.score > 0 ? (
                <span className="text-[9px] text-muted-foreground">
                  score {item.score}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-muted-foreground">{item.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
