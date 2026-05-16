import { Sidebar } from "@/components/dashboard/sidebar"
import { FilesPageContent } from "@/components/files/files-page-content"

export default function FilesPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <FilesPageContent />
    </div>
  )
}