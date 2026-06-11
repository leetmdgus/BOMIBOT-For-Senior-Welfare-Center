"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink, LogOut, RotateCcw } from "lucide-react"

import { useAuth } from "@common/components/auth-provider"
import { Header } from "@common/layouts/header"
import { Sidebar } from "@common/layouts/sidebar"
import { EmployeeAvatar } from "@common/components/employee-avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { APP_MENU_ITEMS } from "@/config/menu"
import {
  getHiddenMenuHrefs,
  resetMenuPreferences,
  setHiddenMenuHrefs,
} from "@/config/menu-preferences"

export function MenuManagementPage() {
  const { session, logout, isLoading } = useAuth()
  const isAdmin = session?.roleType === "admin"
  const [hiddenHrefs, setHiddenHrefs] = useState<string[]>([])

  useEffect(() => {
    setHiddenHrefs(getHiddenMenuHrefs())
  }, [])

  const configurableItems = useMemo(
    () => APP_MENU_ITEMS.filter((item) => item.configurable !== false && item.href !== "#"),
    [],
  )

  const toggleVisible = useCallback((href: string, visible: boolean) => {
    setHiddenHrefs((prev) =>
      visible
        ? prev.filter((h) => h !== href)
        : prev.includes(href)
          ? prev
          : [...prev, href],
    )
  }, [])

  useEffect(() => {
    setHiddenMenuHrefs(hiddenHrefs)
  }, [hiddenHrefs])

  const handleReset = () => {
    resetMenuPreferences()
    setHiddenHrefs([])
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Header />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>계정</CardTitle>
                <CardDescription>
                  로그인 정보와 지역(북부/동부)을 확인합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">불러오는 중…</p>
                ) : session ? (
                  <div className="flex items-center gap-4">
                    <EmployeeAvatar
                      employee={{
                        name: session.name,
                        role: session.role,
                        department: session.department,
                        profileImage: session.profileImage,
                      }}
                      className="size-14 border-2 border-border"
                    />
                    <div>
                      <p className="font-medium">
                        {session.name}{" "}
                        <span className="text-muted-foreground">{session.role}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.department}
                      </p>
                      <p className="text-xs text-primary">
                        {session.orgName} · {session.regionLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">{session.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    로그인 세션이 없습니다.{" "}
                    <Link href="/login" className="text-primary underline">
                      로그인
                    </Link>
                  </p>
                )}

                <Button
                  variant="destructive"
                  className="shrink-0 gap-2"
                  onClick={() => void logout()}
                  disabled={!session}
                >
                  <LogOut className="size-4" />
                  로그아웃
                </Button>
              </CardContent>
            </Card>

            {isAdmin && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>사이드바 메뉴</CardTitle>
                  <CardDescription>
                    표시할 메뉴를 선택합니다. 변경 사항은 이 브라우저에만
                    저장됩니다.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={handleReset}
                >
                  <RotateCcw className="size-3.5" />
                  초기화
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {configurableItems.map((item) => {
                  const Icon = item.icon
                  const visible = !hiddenHrefs.includes(item.href)
                  return (
                    <div
                      key={item.href}
                      className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon className="size-5 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.href}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={item.href}
                          className="text-muted-foreground hover:text-primary"
                          title="페이지 열기"
                        >
                          <ExternalLink className="size-4" />
                        </Link>
                        <Switch
                          checked={visible}
                          onCheckedChange={(checked) =>
                            toggleVisible(item.href, checked)
                          }
                          aria-label={`${item.label} 표시`}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
            )}

            {isAdmin && (
            <p className="text-center text-xs text-muted-foreground">
              전자결재는 /approvals 에서 관리합니다. 메뉴 관리는 관리자에게만 표시됩니다.
            </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
