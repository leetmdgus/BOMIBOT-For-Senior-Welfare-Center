import { Header } from "@/components/common/header"
import { Sidebar } from "@/components/common/sidebar"
import { TaskDetailTabs } from "@/components/kanban/task-detail/task-detail-tabs"

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

      <div className="flex-1 overflow-y-auto">
        <Header />
        <TaskDetailTabs taskId={id} />

        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}