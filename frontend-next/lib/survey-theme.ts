import { DEFAULT_SURVEY_THEME } from "@/lib/constants/brand"
import type { SurveyDetail } from "@/services/survey.types"

const LEGACY_THEME_COLORS = new Set(["#03c75a", "#3b82f6", "#0ea5e9"])

export function resolveSurveyTheme(detail: SurveyDetail) {
  const raw = detail.style.themeColor?.trim()
  const themeColor =
    !raw || LEGACY_THEME_COLORS.has(raw) ? DEFAULT_SURVEY_THEME : raw
  const useBrandClasses =
    themeColor === DEFAULT_SURVEY_THEME || themeColor.includes("oklch")

  return { themeColor, useBrandClasses }
}
