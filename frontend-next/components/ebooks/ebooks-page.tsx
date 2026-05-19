"use client"

import { useEffect, useMemo, useState } from "react"

import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"

import { EbooksToolbar } from "./ebooks-toolbar"
import { EbooksGrid } from "./ebooks-grid"
import { EbooksList } from "./ebooks-list"

import { getCategoryStyles, getEbooks } from "@/services/ebooks.service"
import { Category, CategoryStyles, ViewMode, Book } from "@/services/ebooks.types"

export function EbooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>(["전체"])
  const [categoryStyles, setCategoryStyles] = useState<CategoryStyles | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState("최신순")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    getCategoryStyles()
      .then(setCategoryStyles)
      .catch((error) => {
        console.error("전자책 스타일 데이터 로드 실패:", error)
      })
  }, [])

  useEffect(() => {
    getEbooks({
      category: selectedCategory,
      search: searchQuery,
    })
      .then((result) => {
        setBooks(result.ebooks)
        setCategories(result.categories)
      })
      .catch((error) => {
        console.error("전자책 데이터 로드 실패:", error)
      })
  }, [selectedCategory, searchQuery])

  const filteredBooks = useMemo(() => books, [books])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <Header />

        <div className="p-6">
          <EbooksToolbar
            categories={categories}
            selectedCategory={selectedCategory}
            viewMode={viewMode}
            sortBy={sortBy}
            searchQuery={searchQuery}
            onCategoryChange={setSelectedCategory}
            onViewModeChange={setViewMode}
            onSortChange={setSortBy}
            onSearchChange={setSearchQuery}
          />

          {categoryStyles &&
            (viewMode === "grid" ? (
              <EbooksGrid books={filteredBooks} categoryStyles={categoryStyles} />
            ) : (
              <EbooksList books={filteredBooks} categoryStyles={categoryStyles} />
            ))}
        </div>
      </main>
    </div>
  )
}
