import * as apiService from "./organization.api.service"
import * as mockService from "./organization.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const organizationService = useMockApi ? mockService : apiService

export const getDepartments = organizationService.getDepartments
export const searchEmployees = organizationService.searchEmployees
