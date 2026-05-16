import { Suspense } from "react"
import { SurveyDetailPage } from "@/components/survey/survey-detail-page"

export default function NewSurveyPage() {
  return (
    <Suspense fallback={null}>
      <SurveyDetailPage id="new" />
    </Suspense>
  )
}