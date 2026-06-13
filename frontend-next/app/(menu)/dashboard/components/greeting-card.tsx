"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@common/components/auth-provider"
import { EmployeeAvatar } from "@common/components/employee-avatar"

interface GreetingCardProps {
  currentTime: Date
}

const BANNER_COUNT = 13

const HERO_IMAGES = Array.from(
  { length: BANNER_COUNT },
  (_, index) => `/hero-img/hero_banner_${index + 1}.png`,
)

export function GreetingCard({ currentTime }: GreetingCardProps) {
  const { session } = useAuth()
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)

  const heroImage = useMemo(() => {
    return HERO_IMAGES[currentBannerIndex]
  }, [currentBannerIndex])

  useEffect(() => {
    if (HERO_IMAGES.length <= 1) return

    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % HERO_IMAGES.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  if (!session) return null

  const profileUser = {
    name: session.name,
    role: session.role,
    department: session.department,
    profileImage: session.profileImage,
  }

  return (
    <Card className="relative mb-6 min-h-[160px] overflow-hidden border-0">
      <Image
        src={heroImage}
        alt=""
        fill
        priority
        className="object-cover"
      />

      <div className="absolute inset-0 bg-black/45" />

      <CardContent className="relative z-10 flex min-h-[160px] items-center justify-between p-6 text-white">
        <div className="flex items-center gap-4">
          <EmployeeAvatar
            key={session.profileImage ?? session.id}
            employee={profileUser}
            className="size-12"
            fallbackClassName="text-lg"
            imageCacheKey={session.profileImage}
          />

          <div>
            <h3 className="text-xl font-semibold">
              {session.name} {session.role}님 안녕하세요.
            </h3>

            <p className="text-white/80">
              {session.orgName} ({session.regionLabel}) 운영 현황을 요약해
              드립니다.
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-4xl font-bold tabular-nums tracking-tight">
            {formatTime(currentTime)}
          </p>

          <p className="mt-1 text-sm text-white/80">
            {formatDate(currentTime)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })
}