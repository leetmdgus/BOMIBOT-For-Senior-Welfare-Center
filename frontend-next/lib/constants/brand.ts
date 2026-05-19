/**
 * BOMIBOT 브랜드 색상 — `app/globals.css` :root `--primary` 와 동일하게 유지합니다.
 */
export const BRAND_PRIMARY = "oklch(0.55 0.2 260)"

/** 설문·차트 기본 테마 (미설정 시) */
export const DEFAULT_SURVEY_THEME = BRAND_PRIMARY

/** 만족도 조사 결과 표형 차트 색상 (primary 계열) */
export const SURVEY_MATRIX_CHART_COLORS = {
  매우불만족: "oklch(0.45 0.18 260)",
  불만족: "oklch(0.5 0.16 260)",
  보통: "oklch(0.55 0.2 260)",
  만족: "oklch(0.62 0.16 145)",
  매우만족: "oklch(0.7 0.15 145)",
} as const
