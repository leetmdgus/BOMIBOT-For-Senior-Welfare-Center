// API Helper Functions

const BASE_URL = "/api"

// Generic fetch helper
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
  
  return response.json()
}

// Projects API
export const projectsAPI = {
  getAll: (year?: number) => fetchAPI<any[]>(`/projects${year ? `?year=${year}` : ""}`),
  create: (data: any) => fetchAPI<any>("/projects", { method: "POST", body: JSON.stringify(data) }),
}

// Employees API
export const employeesAPI = {
  getAll: (params?: { department?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.department) searchParams.set("department", params.department)
    if (params?.search) searchParams.set("search", params.search)
    return fetchAPI<any>(`/employees?${searchParams.toString()}`)
  },
}

// Reports API
export const reportsAPI = {
  getPerformance: (year?: string, period?: string) => 
    fetchAPI<any>(`/reports?type=performance&year=${year || "2026"}&period=${period || "월간"}`),
  getBudget: (year?: string) => 
    fetchAPI<any>(`/reports?type=budget&year=${year || "2026"}`),
  getBusinessPlan: (year?: string) => 
    fetchAPI<any>(`/reports?type=businessPlan&year=${year || "2026"}`),
}

// Surveys API
export const surveysAPI = {
  getAll: (status?: string) => fetchAPI<any>(`/surveys${status ? `?status=${status}` : ""}`),
  create: (data: any) => fetchAPI<any>("/surveys", { method: "POST", body: JSON.stringify(data) }),
}

// Dashboard API
export const dashboardAPI = {
  getStats: () => fetchAPI<any>("/dashboard"),
}

// Files API
export const filesAPI = {
  getAll: (params?: { folder?: string; type?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.folder) searchParams.set("folder", params.folder)
    if (params?.type) searchParams.set("type", params.type)
    if (params?.search) searchParams.set("search", params.search)
    return fetchAPI<any>(`/files?${searchParams.toString()}`)
  },
  upload: (data: any) => fetchAPI<any>("/files", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI<any>(`/files?id=${id}`, { method: "DELETE" }),
}

// Ebooks API
export const ebooksAPI = {
  getAll: (params?: { category?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set("category", params.category)
    if (params?.search) searchParams.set("search", params.search)
    return fetchAPI<any>(`/ebooks?${searchParams.toString()}`)
  },
  create: (data: any) => fetchAPI<any>("/ebooks", { method: "POST", body: JSON.stringify(data) }),
}

// Tasks API
export const tasksAPI = {
  getAll: (params?: { projectId?: string; category?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.projectId) searchParams.set("projectId", params.projectId)
    if (params?.category) searchParams.set("category", params.category)
    return fetchAPI<any>(`/tasks?${searchParams.toString()}`)
  },
  create: (data: any) => fetchAPI<any>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  update: (data: any) => fetchAPI<any>("/tasks", { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI<any>(`/tasks?id=${id}`, { method: "DELETE" }),
}
