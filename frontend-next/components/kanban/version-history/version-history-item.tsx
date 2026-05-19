"use client"

import { useState } from "react"
import { ChevronDown, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { VersionHistoryEntry } from "@/services/kanban.version-history.types"
import { VERSION_HISTORY_ACTION_LABELS } from "@/services/kanban.version-history.types"

function formatHistoryDate(date: string) {
  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return date

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed)
}

interface VersionHistoryItemProps {
  entry: VersionHistoryEntry
  isAdmin?: boolean
  isRestoring?: boolean
  onRestore?: (historyId: string) => void
}

export function VersionHistoryItem({
  entry,
  isAdmin = true,
  isRestoring = false,
  onRestore,
}: VersionHistoryItemProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <article className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40"
          >
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {entry.user.slice(0, 1)}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {VERSION_HISTORY_ACTION_LABELS[entry.actionType]}
                </Badge>

                {entry.projectName ? (
                  <span className="text-xs text-muted-foreground">
                    {entry.projectName}
                  </span>
                ) : null}
              </div>

              <p className="text-sm font-medium leading-snug text-foreground">
                <span className="text-primary">{entry.user}</span>
                {entry.userTeam ? (
                  <span className="text-muted-foreground">
                    {" "}
                    ({entry.userTeam})
                  </span>
                ) : null}
                님이 &quot;{entry.target}&quot; {entry.action}
              </p>

              <p className="text-xs text-muted-foreground">
                {formatHistoryDate(entry.date)}
              </p>
            </div>

            <ChevronDown
              className={cn(
                "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
            <div className="space-y-3">
              {entry.changes.map((change, index) => (
                <div
                  key={`${entry.id}-change-${index}`}
                  className="rounded-lg bg-muted/50 p-3"
                >
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    {change.label}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {change.before !== undefined && change.after !== undefined ? (
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          변경 전
                        </p>
                        <p className="text-sm text-foreground">{change.before}</p>
                      </div>
                    ) : null}

                    {change.after !== undefined ? (
                      <div
                        className={cn(
                          "rounded-md border border-primary/20 bg-primary/5 px-3 py-2",
                          change.before === undefined && "sm:col-span-2"
                        )}
                      >
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                          {change.before !== undefined ? "변경 후" : "값"}
                        </p>
                        <p className="text-sm text-foreground">{change.after}</p>
                      </div>
                    ) : null}

                    {change.before !== undefined &&
                    change.after === undefined ? (
                      <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 sm:col-span-2">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-destructive">
                          삭제됨
                        </p>
                        <p className="text-sm text-foreground line-through opacity-70">
                          {change.before}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {isAdmin && entry.canRestore ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRestoring}
                className="w-full gap-2"
                onClick={() => onRestore?.(entry.id)}
              >
                <RotateCcw className="size-4" />
                {isRestoring ? "복원 중..." : "이 시점으로 되돌리기"}
              </Button>
            ) : null}

            {isAdmin && !entry.canRestore ? (
              <p className="text-center text-xs text-muted-foreground">
                이 기록은 복원할 수 없습니다.
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </article>
    </Collapsible>
  )
}
