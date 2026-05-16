import { redirect } from "next/navigation"

export default function Page({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/task/${params.id}/performance/input`)
}