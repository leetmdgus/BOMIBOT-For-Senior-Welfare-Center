import { Suspense } from "react"

import { SurveyRespondPage } from "@public/survey/components/survey-respond-page"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense>
      <SurveyRespondPage id={id} />
    </Suspense>
  )
}
