/** 파일 관리 — 링크 접근(public) 공유 URL */

export function buildFileShareUrl(
  fileId: string,
  options?: { regionId?: string | null },
): string {
  const id = fileId.trim()
  if (!id) return ""

  const params = new URLSearchParams()
  params.set("share", id)
  if (options?.regionId?.trim()) {
    params.set("region", options.regionId.trim())
  }

  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""

  return `${base}/files?${params.toString()}`
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand("copy")
      textarea.remove()
      return ok
    } catch {
      return false
    }
  }
}
