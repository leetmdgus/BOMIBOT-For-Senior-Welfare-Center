import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { StatCardData } from "@/services/dashboard.types"

interface StatsGridProps {
  stats: StatCardData[]
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-6">
      {stats.map((stat) => (
        <StatCard key={stat.labelEn} stat={stat} />
      ))}
    </div>
  )
}

function StatCard({ stat }: { stat: StatCardData }) {
  const Icon = stat.icon

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {stat.labelEn}
            </p>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{stat.value}</span>
              <span className="text-xl text-muted-foreground">
                {stat.unit}
              </span>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {stat.description}
            </p>

            {stat.link && stat.goto && (
              <Link href={stat.goto}>
                <Button
                  variant="ghost"
                  className="mt-3 h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                >
                  {stat.link}
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </Link>
            )}
          </div>

          <div className={cn("rounded-xl p-3", stat.color)}>
            <Icon className="size-6" />
          </div>
        </div>

        {stat.showChart && <MiniTrendChart />}
      </CardContent>
    </Card>
  )
}

function MiniTrendChart() {
  return (
    <div className="absolute bottom-0 right-0 h-24 w-32">
      <svg viewBox="0 0 100 50" className="h-full w-full text-primary/20">
        <path
          d="M0,45 Q25,40 35,30 T60,25 T85,15 T100,10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}