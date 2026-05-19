"use client"

import Link from "next/link"
import { ArrowLeft, Zap } from "lucide-react"

import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"
import { Button } from "@/components/ui/button"

export function AutomationComingSoonPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <Header />

        <div className="flex min-h-[calc(100vh-60px)] flex-1 flex-col items-center justify-center p-6">
          <div className="flex max-w-md flex-col items-center text-center">
            <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-primary/10">
              <Zap className="size-12 text-primary" />
            </div>

            <h1 className="mb-3 text-3xl font-bold text-foreground">
              Coming Soon
            </h1>

            <p className="mb-2 text-lg text-muted-foreground">
              문서자동화 기능이 곧 출시됩니다
            </p>

            <p className="mb-8 text-sm text-muted-foreground">
              자동화된 문서 생성, 알림 발송, 템플릿 관리 등 다양한 기능을
              준비하고 있습니다. 조금만 기다려 주세요!
            </p>

            <Link href="/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="size-4" />
                대시보드로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}