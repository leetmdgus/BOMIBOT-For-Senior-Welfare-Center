import * as apiService from "./organization.api.service"
import * as mockService from "./organization.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const organizationService = useMockApi ? mockService : apiService

export const getDepartments = organizationService.getDepartments
export const searchEmployees = organizationService.searchEmployees
export const getOrganizationContext = organizationService.getOrganizationContext
export const getDepartmentOptions = organizationService.getDepartmentOptions
export const createEmployee = organizationService.createEmployee
export const updateEmployee = organizationService.updateEmployee
export const uploadEmployeeProfileImage =
  organizationService.uploadEmployeeProfileImage
export const updateDepartment =
  organizationService.updateDepartment ?? notAvailableInMock

function notAvailableInMock(): never {
  throw new Error("조직 수정은 FastAPI 백엔드 연결 시에만 사용할 수 있습니다.")
}
