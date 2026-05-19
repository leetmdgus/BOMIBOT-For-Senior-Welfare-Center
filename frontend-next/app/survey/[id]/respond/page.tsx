import { SurveyRespondPage } from "@/components/survey/survey-respond-page"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SurveyRespondPage id={id} />
}
