"use client"

import { REGION_IDS, REGIONS, type RegionId } from "@/lib/auth/regions"
import { cn } from "@/lib/utils"

interface RegionSelectProps {
  value: RegionId
  onChange: (regionId: RegionId) => void
  className?: string
}

export function RegionSelect({ value, onChange, className }: RegionSelectProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {REGION_IDS.map((regionId) => {
        const region = REGIONS[regionId]
        const selected = value === regionId

        return (
          <button
            key={regionId}
            type="button"
            onClick={() => onChange(regionId)}
            className={cn(
              "rounded-lg border px-3 py-3 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted/50",
            )}
          >
            <p className="text-sm font-medium">{region.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{region.orgName}</p>
          </button>
        )
      })}
    </div>
  )
}
