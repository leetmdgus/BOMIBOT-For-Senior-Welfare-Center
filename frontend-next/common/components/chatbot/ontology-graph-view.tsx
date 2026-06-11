"use client"

import { useMemo } from "react"

import type {
  AssistantSubgraphEdge,
  AssistantSubgraphNode,
} from "@/services/chat.types"
import { cn } from "@/lib/utils"

const TYPE_COLORS: Record<string, string> = {
  Platform: "#6366f1",
  Domain: "#0ea5e9",
  SubProject: "#14b8a6",
  DetailCategory: "#22c55e",
  TimePeriod: "#f59e0b",
  PerformanceRecord: "#ef4444",
  MetricBundle: "#f97316",
  DashboardIndicator: "#8b5cf6",
  ProgressIndicator: "#a855f7",
  KanbanProject: "#3b82f6",
  KanbanColumn: "#60a5fa",
  Task: "#93c5fd",
  Department: "#64748b",
  Employee: "#94a3b8",
  Ebook: "#d946ef",
  Survey: "#ec4899",
}

function hashAngle(id: string, index: number, total: number) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  const base = (index / Math.max(total, 1)) * Math.PI * 2
  return base + ((h % 360) * Math.PI) / 180 / 8
}

type Props = {
  nodes: AssistantSubgraphNode[]
  edges: AssistantSubgraphEdge[]
  reasoningPaths?: string[]
  className?: string
  maxHeight?: number
}

export function OntologyGraphView({
  nodes,
  edges,
  reasoningPaths = [],
  className,
  maxHeight = 160,
}: Props) {
  const layout = useMemo(() => {
    const w = 320
    const h = maxHeight
    const cx = w / 2
    const cy = h / 2
    const radius = Math.min(w, h) * 0.38

    const positions = new Map<string, { x: number; y: number }>()
    nodes.forEach((node, i) => {
      const angle = hashAngle(node.id, i, nodes.length)
      positions.set(node.id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      })
    })

    return { w, h, positions }
  }, [nodes, maxHeight])

  if (nodes.length === 0) return null

  return (
    <div className={cn("mt-2 space-y-1.5", className)}>
      <p className="text-[10px] font-medium text-muted-foreground">
        지식 그래프 ({nodes.length}노드 · {edges.length}관계)
      </p>
      <div
        className="overflow-hidden rounded-lg border bg-background/80"
        style={{ maxHeight }}
      >
        <svg
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          className="h-auto w-full"
          role="img"
          aria-label="온톨로지 서브그래프"
        >
          {edges.map((e) => {
            const from = layout.positions.get(e.source)
            const to = layout.positions.get(e.target)
            if (!from || !to) return null
            return (
              <line
                key={`${e.source}-${e.target}-${e.predicate}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeOpacity={0.2}
                strokeWidth={1}
              />
            )
          })}
          {nodes.map((node) => {
            const pos = layout.positions.get(node.id)
            if (!pos) return null
            const fill = TYPE_COLORS[node.type] ?? "#64748b"
            const short =
              node.label.length > 10
                ? `${node.label.slice(0, 9)}…`
                : node.label
            return (
              <g key={node.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={5}
                  fill={fill}
                  stroke="white"
                  strokeWidth={1}
                />
                <title>{`${node.type}: ${node.label}`}</title>
                <text
                  x={pos.x}
                  y={pos.y + 12}
                  textAnchor="middle"
                  fontSize={7}
                  fill="currentColor"
                  opacity={0.65}
                >
                  {short}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      {reasoningPaths.length > 0 ? (
        <ul className="space-y-0.5 text-[10px] text-muted-foreground">
          {reasoningPaths.slice(0, 3).map((path) => (
            <li key={path} className="truncate" title={path}>
              → {path}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
