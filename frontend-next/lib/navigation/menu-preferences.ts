const STORAGE_KEY = "bomi_menu_hidden"
export const MENU_PREFERENCES_EVENT = "bomi-menu-preferences-change"

export function getHiddenMenuHrefs(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : []
  } catch {
    return []
  }
}

export function setHiddenMenuHrefs(hrefs: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hrefs))
  dispatchMenuPreferencesChange()
}

export function resetMenuPreferences(): void {
  localStorage.removeItem(STORAGE_KEY)
  dispatchMenuPreferencesChange()
}

export function dispatchMenuPreferencesChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(MENU_PREFERENCES_EVENT))
}
