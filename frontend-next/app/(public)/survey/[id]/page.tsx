import { Suspense } from "react"

import { SurveyDetailPage } from "@public/survey/components/survey-detail-page"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={null}>
      <SurveyDetailPage id={id} />
    </Suspense>
  )
}
