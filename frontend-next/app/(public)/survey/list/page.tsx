import { Suspense } from "react"

import { SurveyPublicListPage } from "@public/survey/components/survey-public-list-page"

export default function Page() {
  return (
    <Suspense>
      <SurveyPublicListPage />
    </Suspense>
  )
}
