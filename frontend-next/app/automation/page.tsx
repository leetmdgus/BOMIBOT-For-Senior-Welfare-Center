"use client"

import Link from "next/link"
import { Sidebar } from "@/components/common/sidebar"
import { Button } from "@/components/ui/button"
import { Zap, ArrowLeft } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Header } from "@/components/common/header"

export default function AutomationPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header />

        {/* Coming Soon Content */}
        <div className="flex flex-1 flex-col items-center justify-center min-h-[calc(100vh-60px)] p-6">
          <div className="flex flex-col items-center text-center max-w-md">
            <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-primary/10">
              <Zap className="size-12 text-primary" />
            </div>
            
            <h1 className="mb-3 text-3xl font-bold text-foreground">Coming Soon</h1>
            
            <p className="mb-2 text-lg text-muted-foreground">
              문서자동화 기능이 곧 출시됩니다
            </p>
            
            <p className="mb-8 text-sm text-muted-foreground">
              자동화된 문서 생성, 알림 발송, 템플릿 관리 등 다양한 기능을 준비하고 있습니다.
              조금만 기다려 주세요!
            </p>

            <div className="flex gap-3">
              <Link href="/dashboard">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="size-4" />
                  대시보드로 돌아가기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
