import { Header } from "@/components/common/header"
import { Sidebar } from "@/components/common/sidebar"
import { Suspense } from "react"

import { PrintArea } from "@/components/common/print-area"
import { DocumentsHeader } from "@/components/kanban/documents/documents-header"
import { DocumentsProvider } from "@/components/kanban/documents/documents-provider"
import { DocumentsTabSync } from "@/components/kanban/documents/documents-tab-sync"

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1">
        <Header />
        <DocumentsProvider>
          <Suspense fallback={null}>
            <DocumentsTabSync />
          </Suspense>
          <div className="p-6">
            <PrintArea>
              <DocumentsHeader />
              {children}
            </PrintArea>
          </div>
        </DocumentsProvider>
      </main>
    </div>
  )
}
