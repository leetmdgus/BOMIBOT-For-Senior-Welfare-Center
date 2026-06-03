export type HwpxDocKind = "plan" | "evaluation"

const DOC_LABEL: Record<HwpxDocKind, string> = {
  plan: "단위사업계획서",
  evaluation: "사업평가",
}

export function extractYearFromPeriod(period?: string | null): string {
  const text = String(period ?? "")
  const match = /(20\d{2})/.exec(text)
  if (match?.[1]) return match[1]
  return String(new Date().getFullYear())
}

/** 사업명_사업계획|사업평가_연도.hwpx */
export function buildHwpxDownloadFilename(
  businessName: string | null | undefined,
  docKind: HwpxDocKind,
  period?: string | null,
): string {
  const fallback =
    docKind === "plan" ? "사회복지사업 단위사업계획서" : "사업평가서"
  let safe = (businessName?.trim() || fallback).replace(/[\\/:*?"<>|]/g, "_")
  safe = safe.replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^\.+|\.+$/g, "")
  if (!safe) safe = "사업"

  const year = extractYearFromPeriod(period)
  const label = DOC_LABEL[docKind]
  const base = `${safe}_${label}_${year}`
  return base.toLowerCase().endsWith(".hwpx") ? base : `${base}.hwpx`
}
