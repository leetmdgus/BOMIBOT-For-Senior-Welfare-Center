import { Suspense } from "react"

import { Sidebar } from "@/components/common/sidebar"
import { FilesPageContent } from "@/components/files/files-page-content"

export default function FilesPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            파일 목록을 불러오는 중…
          </div>
        }
      >
        <FilesPageContent />
      </Suspense>
    </div>
  )
}