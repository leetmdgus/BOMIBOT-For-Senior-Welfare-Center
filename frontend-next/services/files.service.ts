import * as apiService from "./files.api.service"
import * as mockService from "./files.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const filesService = useMockApi ? mockService : apiService

export const getFileManagerState = filesService.getFileManagerState
export const getFilesList = filesService.getFilesList
