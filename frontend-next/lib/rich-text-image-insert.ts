const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
])

export const RICH_TEXT_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp"

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
}

export function validateRichTextImageFile(file: File): void {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("PNG, JPEG, GIF, WebP 이미지만 넣을 수 있습니다.")
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("이미지는 5MB 이하만 넣을 수 있습니다.")
  }
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  validateRichTextImageFile(file)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("이미지를 읽을 수 없습니다."))
    }
    reader.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."))
    reader.readAsDataURL(file)
  })
}

export function buildRichTextImageHtml(
  src: string,
  alt = "이미지",
): string {
  const safeAlt = escapeHtmlAttr(alt)
  return `<p class="bp-rt-image-wrap"><img src="${src}" alt="${safeAlt}" class="bp-rt-image max-w-full h-auto rounded border border-black/10" /></p>`
}

/** 파일 선택 대화상자 → 본문에 이미지 HTML 삽입 */
export function triggerRichTextImageInsert(
  onInsertHtml: (html: string) => void,
): void {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = RICH_TEXT_IMAGE_ACCEPT
  input.style.display = "none"
  document.body.appendChild(input)

  input.addEventListener(
    "change",
    () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) return
      void readImageFileAsDataUrl(file)
        .then((dataUrl) => {
          onInsertHtml(buildRichTextImageHtml(dataUrl, file.name))
        })
        .catch((error) => {
          console.error("이미지 삽입 실패:", error)
          window.alert(
            error instanceof Error
              ? error.message
              : "이미지를 넣을 수 없습니다.",
          )
        })
    },
    { once: true },
  )

  input.click()
}

export async function insertRichTextImageFromFile(
  file: File,
  onInsertHtml: (html: string) => void,
): Promise<void> {
  const dataUrl = await readImageFileAsDataUrl(file)
  onInsertHtml(buildRichTextImageHtml(dataUrl, file.name))
}
