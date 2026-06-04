import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./organization.api.service"
import * as mockService from "./organization.mock.service"

const organizationService = shouldUseMockApi() ? mockService : apiService

export const getDepartments = organizationService.getDepartments
export const searchEmployees = organizationService.searchEmployees
export const getOrganizationContext = organizationService.getOrganizationContext
export const getDepartmentOptions = organizationService.getDepartmentOptions
export const createEmployee = organizationService.createEmployee
export const updateEmployee = organizationService.updateEmployee
export const deleteEmployee = organizationService.deleteEmployee
export const uploadEmployeeProfileImage =
  organizationService.uploadEmployeeProfileImage
export const updateDepartment = organizationService.updateDepartment
