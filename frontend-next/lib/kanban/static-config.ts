import type {
  ColumnType,
  ProjectImageOption,
  Staff,
} from "@/services/kanban.board.types"

const CATEGORY_COLUMN_TYPE_MAP: Record<string, ColumnType> = {
  실적관리: "실적관리",
  사업계획: "사업계획",
  사업계획서: "사업계획",
  만족도조사: "만족도조사",
  사업평가: "사업평가",
}

const DEFAULT_COLUMN_TYPE: ColumnType = "실적관리"

export function resolveColumnTypeForCategoryTitle(title: string): ColumnType {
  return CATEGORY_COLUMN_TYPE_MAP[title.trim()] ?? DEFAULT_COLUMN_TYPE
}

/** 백엔드 `static_config.PROJECT_IMAGE_OPTIONS` 와 동일 */
export const DEFAULT_PROJECT_IMAGE_OPTIONS: ProjectImageOption[] = [
  { label: "상담", value: "/Counseling-removebg-preview.png" },
  { label: "교육", value: "/Education-removebg-preview.png" },
  { label: "건강", value: "/Health-removebg-preview.png" },
  { label: "돌봄", value: "/Care-removebg-preview.png" },
  { label: "지역사회", value: "/Community-removebg-preview.png" },
]

/** 백엔드 `static_config.STAFF` 와 동일 */
export const DEFAULT_KANBAN_STAFF: Staff[] = [
  { id: "1", name: "김태민", team: "복지 1팀", position: "사회복지사" },
  { id: "2", name: "이창환", team: "복지 1팀", position: "사회복지사" },
  { id: "3", name: "이승현", team: "복지 1팀", position: "사회복지사" },
  { id: "4", name: "김영수", team: "복지 2팀", position: "사회복지사" },
  { id: "5", name: "박지연", team: "복지 2팀", position: "사회복지사" },
  { id: "6", name: "최민수", team: "운영지원팀", position: "사회복지사" },
]
