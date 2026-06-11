import { Header } from "@common/layouts/header"
import { Sidebar } from "@common/layouts/sidebar"
import { Suspense } from "react"

import { PrintArea } from "@common/components/print-area"
import { DocumentsHeader } from "@menu/kanban/components/documents/documents-header"
import { DocumentsPrintMeta } from "@menu/kanban/components/documents/documents-print-meta"
import { DocumentsPrintSetup } from "@menu/kanban/components/documents/documents-print-setup"
import { DocumentsProvider } from "@menu/kanban/components/documents/documents-provider"
import { DocumentsTabSync } from "@menu/kanban/components/documents/documents-tab-sync"

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 print:overflow-visible">
        <Header />
        <DocumentsProvider>
          <DocumentsPrintSetup />
          <Suspense fallback={null}>
            <DocumentsTabSync />
          </Suspense>
          <div className="p-6 print:p-0">
            <PrintArea className="print-document kanban-documents-print">
              <div className="print-document-root space-y-4">
                <DocumentsPrintMeta />
                <DocumentsHeader />
                {children}
              </div>
            </PrintArea>
          </div>
        </DocumentsProvider>
      </main>
    </div>
  )
}
