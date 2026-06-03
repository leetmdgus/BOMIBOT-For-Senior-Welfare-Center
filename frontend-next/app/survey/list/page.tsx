import { Suspense } from "react"

import { SurveyPublicListPage } from "@/components/survey/survey-public-list-page"

export default function Page() {
  return (
    <Suspense>
      <SurveyPublicListPage />
    </Suspense>
  )
}
