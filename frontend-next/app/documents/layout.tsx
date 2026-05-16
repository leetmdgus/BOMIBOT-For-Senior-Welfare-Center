import { Sidebar } from "@/components/dashboard/sidebar"
import { DocumentsNav } from "@/components/documents/documents-nav"

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 p-6">
        <DocumentsNav />
        {children}
      </main>
    </div>
  )
}