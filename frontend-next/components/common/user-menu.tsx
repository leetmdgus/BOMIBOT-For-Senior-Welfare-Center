"use client"

import Link from "next/link"
import { LogOut, Settings, ChevronDown, UserCircle } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { EmployeeAvatar } from "@/components/organization/employee-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MENU_MANAGEMENT_HREF } from "@/lib/navigation/app-menu"

export function UserMenu() {
  const { session, logout, isLoading } = useAuth()

  if (isLoading || !session) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 pl-1.5 pr-2"
          aria-label="계정 메뉴"
        >
          <EmployeeAvatar
            employee={{
              name: session.name,
              role: session.role,
              department: session.department,
              profileImage: session.profileImage,
            }}
            className="size-7"
            fallbackClassName="text-xs"
          />
          <span className="hidden max-w-[8rem] truncate sm:inline">
            {session.name}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium">{session.name}</p>
          <p className="text-xs text-muted-foreground">{session.email}</p>
          <p className="text-xs text-primary">
            {session.orgName} · {session.regionLabel}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/organization?me=1" className="cursor-pointer gap-2">
            <UserCircle className="size-4" />
            내 정보 수정
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={MENU_MANAGEMENT_HREF} className="cursor-pointer gap-2">
            <Settings className="size-4" />
            메뉴 관리
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer gap-2"
          onClick={() => void logout()}
        >
          <LogOut className="size-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
