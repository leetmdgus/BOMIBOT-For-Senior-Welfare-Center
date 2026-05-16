import { Project } from "@/lib/mock-data"
import { projectsMock } from "../../mocks/projects.mock"

export async function getProjects(year: string): Promise<Project[]> {
  // TODO: 백엔드 연결 시 아래 mock 반환을 fetch/axios로 교체
  // return fetch(`/api/projects?year=${year}`).then((res) => res.json())

  console.log("selected year:", year)

  return Promise.resolve(projectsMock)
}