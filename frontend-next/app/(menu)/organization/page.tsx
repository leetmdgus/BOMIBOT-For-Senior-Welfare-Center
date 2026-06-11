import { Suspense } from "react"

import { OrganizationPage } from "@menu/organization/components/organization-page"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          조직현황을 불러오는 중…
        </div>
      }
    >
      <OrganizationPage />
    </Suspense>
  )
}