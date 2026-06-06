import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./files.api.service"
import * as mockService from "./files.mock.service"

const filesService = shouldUseMockApi() ? mockService : apiService

export const getFileManagerState = filesService.getFileManagerState
export const getFilesList = filesService.getFilesList
export const createFile = filesService.createFile
export const deleteFile = filesService.deleteFile
export const patchFile = filesService.patchFile
export const saveFileManagerState = filesService.saveFileManagerState
export const uploadFilesToServer =
  "uploadFilesToServer" in filesService
    ? filesService.uploadFilesToServer
    : undefined
export const copyFile =
  "copyFile" in filesService ? filesService.copyFile : undefined
export const downloadFileBlob =
  "downloadFileBlob" in filesService ? filesService.downloadFileBlob : undefined
export const downloadFileToDisk =
  "downloadFileToDisk" in filesService ? filesService.downloadFileToDisk : undefined
export const exportFilesArchive =
  "exportFilesArchive" in filesService ? filesService.exportFilesArchive : undefined
export const renderFileSvg = filesService.renderFileSvg
export type { FileSvgRenderResult } from "./files.api.service"
