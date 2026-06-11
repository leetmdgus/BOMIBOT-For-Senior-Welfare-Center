"use client"

import { Users } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { PresenceMember } from "@/lib/collaboration/types"

interface CollaborationPresenceBarProps {
  presence: PresenceMember[]
  isConnected?: boolean
  editingLabel?: string
  className?: string
}

export function CollaborationPresenceBar({
  presence,
  isConnected = false,
  editingLabel,
  className,
}: CollaborationPresenceBarProps) {
  if (!isConnected && presence.length === 0) return null

  const editors = presence.filter((member) => member.focus === "editing")

  return (
    <div
      className={cn(
        "print-hide flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs",
        className,
      )}
    >
      <Users className="size-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">
        {isConnected ? "실시간 협업 연결됨" : "연결 중…"}
      </span>

      {presence.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {presence.map((member) => (
            <span
              key={`${member.userId}-${member.userName}`}
              className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 shadow-sm"
            >
              <Avatar className="size-5">
                <AvatarFallback className="text-[10px]">
                  {member.userName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{member.userName}</span>
              {member.focus === "editing" ? (
                <span className="text-primary">편집 중</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {editingLabel ? (
        <span className="text-muted-foreground">{editingLabel}</span>
      ) : null}

      {editors.length > 0 && !editingLabel ? (
        <span className="text-primary">
          {editors.map((e) => e.userName).join(", ")}님이 편집 중
        </span>
      ) : null}
    </div>
  )
}
