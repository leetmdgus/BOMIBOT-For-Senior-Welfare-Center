import { SurveyDetailPage } from "@/components/survey/survey-detail-page"

export default function Page({
  params,
}: {
  params: { id: string }
}) {
  return <SurveyDetailPage id={params.id} />
}