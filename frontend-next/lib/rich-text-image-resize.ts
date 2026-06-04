/**
 * 본문 에디터에 삽입된 이미지에 드래그 리사이즈 핸들을 부착한다.
 * 표 리사이즈 핸들(rich-text-table-utils)과 동일한 방식:
 *  - 핸들은 `contenteditable="false"` 요소로 DOM 에 추가되고 innerHTML 에 보존된다.
 *  - 인쇄/내보내기 시 prepare-print-area-html 에서 `.bp-rt-image-resize` 를 제거한다.
 * 너비는 img 의 인라인 style 로 저장되며, 드래그 종료 시 에디터에 input 이벤트를 보내
 * 기존 onInput(emitChange) 경로로 영속화한다.
 */

const MIN_IMAGE_WIDTH_PX = 40

function startImageResizeDrag(e: MouseEvent, img: HTMLImageElement): void {
  e.preventDefault()
  e.stopPropagation()

  const startX = e.clientX
  const startWidth = img.getBoundingClientRect().width

  // 컨테이너(문단) 폭을 넘지 않도록 상한 설정
  const frame = img.closest(".bp-rt-image-frame")
  const container = frame?.parentElement
  const maxWidth = container?.getBoundingClientRect().width ?? 0

  document.body.style.cursor = "nwse-resize"
  document.body.style.userSelect = "none"

  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientX - startX
    let next = Math.max(MIN_IMAGE_WIDTH_PX, startWidth + delta)
    if (maxWidth > 0) next = Math.min(next, maxWidth)
    img.style.width = `${Math.round(next)}px`
    img.style.height = "auto"
  }

  const onUp = () => {
    document.removeEventListener("mousemove", onMove)
    document.removeEventListener("mouseup", onUp)
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
    // 변경된 너비를 에디터 onInput(emitChange) 으로 영속화
    img
      .closest(".bp-rich-editor")
      ?.dispatchEvent(new Event("input", { bubbles: true }))
  }

  document.addEventListener("mousemove", onMove)
  document.addEventListener("mouseup", onUp)
}

/**
 * 에디터 안의 모든 본문 이미지를 inline-block 프레임으로 감싸고 코너 리사이즈 핸들을 붙인다.
 * 이미 처리된 이미지는 건너뛴다(멱등). 기존에 저장된(프레임 없는) 이미지도 자동 업그레이드.
 * @param onBeforeMutation 드래그 시작 직전 호출 — 실행취소 스냅샷 적재용
 */
export function enhanceAllRichTextImages(
  root: HTMLElement,
  onBeforeMutation?: () => void,
): void {
  root.querySelectorAll("img.bp-rt-image").forEach((node) => {
    if (!(node instanceof HTMLImageElement)) return
    const img = node

    let frame = img.parentElement
    if (!(frame instanceof HTMLElement) || !frame.classList.contains("bp-rt-image-frame")) {
      const wrapper = document.createElement("span")
      wrapper.className = "bp-rt-image-frame"
      img.replaceWith(wrapper)
      wrapper.appendChild(img)
      frame = wrapper
    }

    if (frame.querySelector(":scope > .bp-rt-image-resize")) return

    const handle = document.createElement("span")
    handle.className = "bp-rt-image-resize"
    handle.title = "이미지 크기 조절 (드래그)"
    handle.setAttribute("contenteditable", "false")
    handle.addEventListener("mousedown", (e) => {
      onBeforeMutation?.()
      startImageResizeDrag(e, img)
    })
    frame.appendChild(handle)
  })
}
