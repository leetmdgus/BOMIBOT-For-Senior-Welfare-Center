import type { Department, Employee } from "./organization.types"

export async function getDepartments(): Promise<Department[]> {
  const response = await fetch("/api/employees")

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  const data = (await response.json()) as { departments: Department[] }

  return data.departments
}

export async function searchEmployees(params?: {
  search?: string
  department?: string
}): Promise<{ departments: Department[]; employees: Employee[] }> {
  const searchParams = new URLSearchParams()

  if (params?.search) searchParams.set("search", params.search)
  if (params?.department) searchParams.set("department", params.department)

  const query = searchParams.toString()
  const response = await fetch(`/api/employees${query ? `?${query}` : ""}`)

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}
