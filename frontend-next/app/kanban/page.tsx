"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles } from "lucide-react"

import { ProjectSection } from "@/components/kanban/project-section"
import { Sidebar } from "@/components/common/sidebar"
import { Project } from "@/lib/mock-data"
import { getProjects } from "../api/projects/kanban/services/projects.service"
import { Header } from "@/components/common/header"
import { SubHeader } from "@/components/kanban/subheader"

export default function Kanban() {
  const [year, setYear] = useState("2026")
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refreshProjects = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await getProjects(year)
      setProjects(data)
    } finally {
      setIsLoading(false)
    }
  }, [year])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <SubHeader year={year} onYearChange={setYear}/>
          <main className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">
                데이터를 불러오는 중입니다.
              </div>
            ) : (
              <div className="space-y-6">
                {projects.map((project) => (
                  <ProjectSection
                    key={project.id}
                    {...project}
                    onRefresh={refreshProjects}
                  />
                ))}
              </div>
            )}
          </main>

          <button
            type="button"
            className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          >
            <Sparkles className="size-6" />
          </button>
        </div>
      </div>
    </div>
  )
}