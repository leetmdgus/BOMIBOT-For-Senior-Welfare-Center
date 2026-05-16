import { redirect } from "next/navigation"

export default async function TaskDetailIndexPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  redirect(`/task/${id}/survey`)
}