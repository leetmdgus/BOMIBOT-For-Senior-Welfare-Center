import { Header } from "@/components/common/header"
import { Sidebar } from "@/components/common/sidebar"
import { DocumentsNav } from "@/components/kanban/documents/documents-nav"

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
        <div className="p-6">
          <DocumentsNav />
          {children}
        </div>
      </main>
    </div>
  )
}