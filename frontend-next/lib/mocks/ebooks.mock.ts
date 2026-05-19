import {
  BarChart3,
  FileText,
  Search,
  Sparkles,
} from "lucide-react"

import {
  Book,
  Category,
} from "@/services/ebooks.types"

export const categories: Category[] = [
  "전체",
  "운영보고서",
  "리플릿",
  "소식지",
  "안내서",
  "기념집",
]

export const booksData: Book[] = [
  {
    id: "1",
    title: "2025년도 운영계획보고서",
    team: "기획전략팀",
    category: "운영보고서",
    thumbnail:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
  },
]

export const categoryStyles: Record<Category, string> = {
  전체: "bg-muted text-muted-foreground",
  운영보고서: "bg-blue-100 text-blue-700",
  리플릿: "bg-pink-100 text-pink-700",
  소식지: "bg-green-100 text-green-700",
  안내서: "bg-amber-100 text-amber-700",
  기념집: "bg-purple-100 text-purple-700",
}

export const suggestedQuestions = [
  {
    icon: BarChart3,
    text: "2분기에 실적횟수가 가장 많은 사업은 뭐야?",
  },
  {
    icon: Sparkles,
    text: "사회 프로그램에 배정된 예산 중 남은 잔액이 있어?",
  },
  {
    icon: Search,
    text: "세대 통합 참여자 명단만 따로 추출해서 표로 만들어줘.",
  },
  {
    icon: FileText,
    text: "현재 사업계획서의 기대효과 부분을 요약해줘.",
  },
]