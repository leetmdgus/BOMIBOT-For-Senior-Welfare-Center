import * as apiService from "./survey.api.service"
import * as mockService from "./survey.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"
const surveyService = useMockApi ? mockService : apiService

export const getSurveyList = surveyService.getSurveyList
export const getSurveyDetail = surveyService.getSurveyDetail
export const saveSurvey = surveyService.saveSurvey
export const getSurveyResults = surveyService.getSurveyResults
export const submitSurveyResponse = surveyService.submitSurveyResponse
export const deleteSurvey =
  "deleteSurvey" in surveyService ? surveyService.deleteSurvey : undefined
