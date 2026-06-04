import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./organization.api.service"
import * as mockService from "./organization.mock.service"

const organizationService = shouldUseMockApi() ? mockService : apiService

export const getDepartments = organizationService.getDepartments
export const searchEmployees = organizationService.searchEmployees
export const getOrganizationContext = organizationService.getOrganizationContext
export const getDepartmentOptions = organizationService.getDepartmentOptions

// 회원가입(비로그인) 부서 선택 — mock 모드에선 지역별 목 데이터, 실서버에선 공개 엔드포인트.
export const getPublicDepartmentOptions: typeof apiService.getPublicDepartmentOptions =
  (regionId) =>
    shouldUseMockApi()
      ? mockService.getDepartmentOptions(regionId as never)
      : apiService.getPublicDepartmentOptions(regionId)
export const createEmployee = organizationService.createEmployee
export const updateEmployee = organizationService.updateEmployee
export const deleteEmployee = organizationService.deleteEmployee
export const uploadEmployeeProfileImage =
  organizationService.uploadEmployeeProfileImage
export const updateDepartment = organizationService.updateDepartment
