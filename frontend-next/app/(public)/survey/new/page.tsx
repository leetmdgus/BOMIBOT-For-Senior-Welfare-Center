import { Suspense } from "react"
import { SurveyDetailPage } from "@public/survey/components/survey-detail-page"

export default function NewSurveyPage() {
  return (
    <Suspense fallback={null}>
      <SurveyDetailPage id="new" />
    </Suspense>
  )
}