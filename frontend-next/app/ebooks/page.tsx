"use client"

import { useState } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/common/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Menu,
  Plus,
  Search,
  Grid3X3,
  List,
  ChevronDown,
  Settings,
  Sparkles,
  FileText,
  BarChart3,
  Send,
  Minimize2,
  Maximize2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then(res => res.json())

type Category = "전체" | "운영보고서" | "리플릿" | "소식지" | "안내서" | "기념집"
type ViewMode = "grid" | "list"

interface Book {
  id: string
  title: string
  team: string
  category: Category
  thumbnail: string
}

const categories: Category[] = ["전체", "운영보고서", "리플릿", "소식지", "안내서", "기념집"]

const booksData: Book[] = [
  {
    id: "1",
    title: "2025년도 운영계획보고서",
    team: "기획전략팀",
    category: "운영보고서",
    thumbnail: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
  },
  {
    id: "2",
    title: "동계 복지 프로그램 리플릿",
    team: "복지3팀",
    category: "리플릿",
    thumbnail: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop",
  },
  {
    id: "3",
    title: "춘천복부 소식지 4월호",
    team: "홍보팀",
    category: "소식지",
    thumbnail: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=300&fit=crop",
  },
  {
    id: "4",
    title: "사회복지 업무 안내서",
    team: "운영총괄",
    category: "안내서",
    thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop",
  },
  {
    id: "5",
    title: "2024년 연간 운영보고서",
    team: "기획전략팀",
    category: "운영보고서",
    thumbnail: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop",
  },
  {
    id: "6",
    title: "노인복지 프로그램 리플릿",
    team: "복지1팀",
    category: "리플릿",
    thumbnail: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=300&fit=crop",
  },
  {
    id: "7",
    title: "창립 30주년 기념집",
    team: "운영총괄",
    category: "기념집",
    thumbnail: "https://images.unsplash.com/photo-1519682577862-22b62b24e493?w=400&h=300&fit=crop",
  },
  {
    id: "8",
    title: "춘천복부 소식지 3월호",
    team: "홍보팀",
    category: "소식지",
    thumbnail: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&h=300&fit=crop",
  },
]

const categoryStyles: Record<Category, string> = {
  "전체": "bg-muted text-muted-foreground",
  "운영보고서": "bg-blue-100 text-blue-700",
  "리플릿": "bg-pink-100 text-pink-700",
  "소식지": "bg-green-100 text-green-700",
  "안내서": "bg-amber-100 text-amber-700",
  "기념집": "bg-purple-100 text-purple-700",
}

const suggestedQuestions = [
  { icon: BarChart3, text: "2분기에 실적횟수가 가장 많은 사업은 뭐야?" },
  { icon: Sparkles, text: "사회 프로그램에 배정된 예산 중 남은 잔액이 있어?" },
  { icon: Search, text: "세대 통합 참여자 명단만 따로 추출해서 표로 만들어줘." },
  { icon: FileText, text: "현재 사업계획서의 기대효과 부분을 요약해줘." },
]

export default function EbooksPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState("최신순")
  const [searchQuery, setSearchQuery] = useState("")
  const [chatOpen, setChatOpen] = useState(true)
  const [chatMinimized, setChatMinimized] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const { data: ebooksApiData } = useSWR(`/api/ebooks?category=${selectedCategory}&search=${searchQuery}`, fetcher)

  const filteredBooks = booksData.filter((book) => {
    const matchesCategory = selectedCategory === "전체" || book.category === selectedCategory
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.team.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold">전자책자</h1>
              <p className="text-sm text-muted-foreground">
                산하기관 &gt; 춘천북부노인복지관 &gt; 전자책자
              </p>
            </div>
          </div>

        </header>

        {/* Content */}
        <div className="p-6">
          {/* Toolbar */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <Button className="bg-[#1a2744] text-white hover:bg-[#1a2744]/90">
              <Plus className="mr-2 size-4" />
              신규 도서 등록
            </Button>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    selectedCategory === category
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded p-1.5 transition-colors",
                    viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Grid3X3 className="size-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "rounded p-1.5 transition-colors",
                    viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="size-4" />
                </button>
              </div>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    SORT
                    <span className="font-medium">{sortBy}</span>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("최신순")}>최신순</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("오래된순")}>오래된순</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("이름순")}>이름순</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="도서명 또는 발행부서 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-9"
                />
              </div>

              <Button variant="ghost" size="icon">
                <Settings className="size-5" />
              </Button>
            </div>
          </div>

          {/* Books Grid/List */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={book.thumbnail}
                      alt={book.title}
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="mb-2 font-medium text-card-foreground line-clamp-2">
                      {book.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{book.team}</span>
                      <Badge className={cn("text-xs", categoryStyles[book.category])}>
                        {book.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md"
                >
                  <div className="size-16 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={book.thumbnail}
                      alt={book.title}
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-card-foreground">{book.title}</h3>
                    <p className="text-sm text-muted-foreground">{book.team}</p>
                  </div>
                  <Badge className={cn("text-xs", categoryStyles[book.category])}>
                    {book.category}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
