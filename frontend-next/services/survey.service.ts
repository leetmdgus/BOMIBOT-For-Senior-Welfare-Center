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
