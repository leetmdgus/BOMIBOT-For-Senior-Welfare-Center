import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./survey.api.service"
import * as mockService from "./survey.mock.service"

const surveyService = shouldUseMockApi() ? mockService : apiService

export const getSurveyList = surveyService.getSurveyList
export const getSurveyDetail = surveyService.getSurveyDetail
export const saveSurvey = surveyService.saveSurvey
export const getSurveyResults = surveyService.getSurveyResults
export const submitSurveyResponse = surveyService.submitSurveyResponse
export const deleteSurvey =
  "deleteSurvey" in surveyService ? surveyService.deleteSurvey : undefined

// ── 공개(QR) 설문 — 지역을 명시적으로 받아 호출. mock 모드에선 지역 무시(목 데이터) ──
export const getPublicSurveyList: typeof apiService.getPublicSurveyList = (
  regionId,
  options,
) =>
  shouldUseMockApi()
    ? mockService.getSurveyList(options)
    : apiService.getPublicSurveyList(regionId, options)

export const getPublicSurveyDetail: typeof apiService.getPublicSurveyDetail = (
  regionId,
  id,
) =>
  shouldUseMockApi()
    ? mockService.getSurveyDetail(id)
    : apiService.getPublicSurveyDetail(regionId, id)

export const submitPublicSurveyResponse: typeof apiService.submitPublicSurveyResponse =
  (regionId, id, payload) =>
    shouldUseMockApi()
      ? mockService.submitSurveyResponse(id, payload)
      : apiService.submitPublicSurveyResponse(regionId, id, payload)
