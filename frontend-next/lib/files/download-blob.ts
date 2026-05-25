/** Content-Disposition에서 파일명 추출 */
export function parseContentDispositionFilename(
  header: string | null,
): string | null {
  if (!header) return null

  const utf8 = /filename\*=UTF-8''([^;\s]+)/i.exec(header)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      return utf8[1]
    }
  }

  const quoted = /filename="([^"]+)"/i.exec(header)
  if (quoted?.[1]) return quoted[1]

  const plain = /filename=([^;\s]+)/i.exec(header)
  if (plain?.[1]) return plain[1].replace(/"/g, "")

  return null
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
