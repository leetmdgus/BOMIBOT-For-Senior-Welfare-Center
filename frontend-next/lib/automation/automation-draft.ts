// 문서자동화 임시저장(draft) — IndexedDB에 작업 중인 문서를 보관해 F5/탭 이동에도 유지.
// File 원본(Blob)·편집 JSON·분석 메타를 한 레코드로 저장한다.

const DB_NAME = "bomibot-automation"
const STORE = "draft"
const KEY = "current"
const DB_VERSION = 1

export type AutomationDraft = {
  fileName: string
  /** rhwp 정확 렌더/내보내기에 필요한 원본 바이트 */
  fileBlob: Blob | null
  /** 편집 중인 frontend JSON (HwpxFrontendDocument) */
  editedDoc: unknown
  /** 분석 결과 메타(kind/plainText/summary 등) */
  analysis: unknown
  /** 저장 대상 업무(카테고리) id — 마지막 선택값 기억 */
  taskId?: string | null
  savedAt: number
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined"
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveAutomationDraft(draft: AutomationDraft): Promise<void> {
  if (!hasIndexedDb()) return
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(draft, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // 임시저장 실패는 작업을 막지 않는다(용량 초과/프라이빗 모드 등)
  }
}

export async function loadAutomationDraft(): Promise<AutomationDraft | null> {
  if (!hasIndexedDb()) return null
  try {
    const db = await openDb()
    const result = await new Promise<AutomationDraft | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly")
        const req = tx.objectStore(STORE).get(KEY)
        req.onsuccess = () => resolve((req.result as AutomationDraft) ?? null)
        req.onerror = () => reject(req.error)
      },
    )
    db.close()
    return result
  } catch {
    return null
  }
}

export async function clearAutomationDraft(): Promise<void> {
  if (!hasIndexedDb()) return
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // noop
  }
}
