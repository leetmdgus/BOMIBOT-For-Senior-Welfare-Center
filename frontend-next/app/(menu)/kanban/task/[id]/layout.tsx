import { Header } from "@common/layouts/header"
import { PrintArea } from "@common/components/print-area"
import { Sidebar } from "@common/layouts/sidebar"
import { TaskDetailToolbarOffset } from "@menu/kanban/components/task-detail/task-detail-sticky-chrome"
import { TaskDetailTabs } from "@menu/kanban/components/task-detail/task-detail-tabs"

export default async function TaskDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div
        id="task-detail-scroll"
        className="flex-1 overflow-y-auto [--task-detail-toolbar-offset:7.5rem]"
      >
        <div
          id="task-detail-sticky-chrome"
          className="print-hide sticky top-0 z-50 bg-card shadow-sm"
        >
          <Header />
          <TaskDetailTabs taskId={id} />
        </div>
        <TaskDetailToolbarOffset />

        <main className="p-4 print:p-0">
          <PrintArea className="print-document">{children}</PrintArea>
        </main>
      </div>
    </div>
  )
}