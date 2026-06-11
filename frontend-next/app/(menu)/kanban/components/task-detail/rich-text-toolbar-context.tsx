"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type {
  RichTextEditorHandle,
  RichTextToolbarVariant,
} from "./business-plan-rich-text"

type EditorEntry = {
  label: string
  handle: RichTextEditorHandle
}

type RichTextToolbarContextValue = {
  enabled: boolean
  variant: RichTextToolbarVariant
  setVariant: (variant: RichTextToolbarVariant) => void
  activeEditor: RichTextEditorHandle | null
  activeLabel: string
  /** 요약 표·본문 등 포커스된 블록(리치 에디터 없음 포함) */
  hasActiveBlock: boolean
  registerEditor: (
    id: string,
    label: string,
    handle: RichTextEditorHandle | null,
  ) => void
  activateEditor: (id: string, label: string) => void
  registerFieldBlock: (id: string, label: string) => void
  activateFieldBlock: (id: string) => void
}

const RichTextToolbarContext =
  createContext<RichTextToolbarContextValue | null>(null)

export function RichTextToolbarProvider({
  children,
  enabled = true,
}: {
  children: ReactNode
  enabled?: boolean
}) {
  const [variant, setVariant] = useState<RichTextToolbarVariant>("full")
  const [activeId, setActiveId] = useState<string | null>(null)
  const editorsRef = useRef<Map<string, EditorEntry>>(new Map())
  const fieldBlocksRef = useRef<Map<string, string>>(new Map())
  const [revision, setRevision] = useState(0)

  const bump = useCallback(() => setRevision((n) => n + 1), [])

  const registerEditor = useCallback(
    (id: string, label: string, handle: RichTextEditorHandle | null) => {
      if (!handle) {
        if (!editorsRef.current.has(id)) return
        editorsRef.current.delete(id)
        if (activeId === id) {
          setActiveId(null)
        }
        bump()
        return
      }
      const prev = editorsRef.current.get(id)
      if (prev?.handle === handle && prev.label === label) return
      editorsRef.current.set(id, { label, handle })
      bump()
    },
    [activeId, bump],
  )

  const activateEditor = useCallback(
    (id: string, label: string) => {
      const entry = editorsRef.current.get(id)
      const idChanged = activeId !== id
      if (idChanged) {
        setActiveId(id)
      }
      if (entry && entry.label !== label) {
        editorsRef.current.set(id, { ...entry, label })
      }
      if (idChanged || (entry && entry.label !== label)) {
        bump()
      }
    },
    [activeId, bump],
  )

  const registerFieldBlock = useCallback(
    (id: string, label: string) => {
      if (fieldBlocksRef.current.get(id) === label) return
      fieldBlocksRef.current.set(id, label)
      bump()
    },
    [bump],
  )

  const activateFieldBlock = useCallback(
    (id: string) => {
      if (!fieldBlocksRef.current.has(id)) return
      if (activeId !== id) {
        setActiveId(id)
        bump()
      }
    },
    [activeId, bump],
  )

  const activeEntry = activeId ? editorsRef.current.get(activeId) : undefined
  const activeEditor = activeEntry?.handle ?? null
  const activeLabel =
    activeEntry?.label ?? (activeId ? fieldBlocksRef.current.get(activeId) : "") ?? ""
  const hasActiveBlock = Boolean(activeId && activeLabel)

  const value = useMemo(
    () => ({
      enabled,
      variant,
      setVariant,
      activeEditor,
      activeLabel,
      hasActiveBlock,
      registerEditor,
      activateEditor,
      registerFieldBlock,
      activateFieldBlock,
    }),
    [
      enabled,
      variant,
      activeEditor,
      activeLabel,
      hasActiveBlock,
      registerEditor,
      activateEditor,
      registerFieldBlock,
      activateFieldBlock,
      revision,
    ],
  )

  return (
    <RichTextToolbarContext.Provider value={value}>
      {children}
    </RichTextToolbarContext.Provider>
  )
}

export function useRichTextToolbar() {
  const ctx = useContext(RichTextToolbarContext)
  if (!ctx) {
    throw new Error(
      "useRichTextToolbar must be used within RichTextToolbarProvider",
    )
  }
  return ctx
}

export function useRichTextToolbarOptional() {
  return useContext(RichTextToolbarContext)
}

/** 본문 블록 — 상단 공용 툴바에 에디터 등록 */
export function useRichTextEditorSlot(id: string, label: string) {
  const ctx = useRichTextToolbarOptional()
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const handleRef = useRef<RichTextEditorHandle | null>(null)
  const labelRef = useRef(label)
  labelRef.current = label

  const setEditor = useCallback((handle: RichTextEditorHandle | null) => {
    handleRef.current = handle
    ctxRef.current?.registerEditor(id, labelRef.current, handle)
  }, [id])

  const onActivate = useCallback(() => {
    ctxRef.current?.activateEditor(id, labelRef.current)
  }, [id])

  return {
    setEditor,
    onActivate,
    variant: ctx?.variant ?? ("full" as RichTextToolbarVariant),
    toolbarEnabled: ctx?.enabled ?? false,
  }
}

/** 요약 표·단일칸 등 — 블록으로 툴바 라벨·포커스 연동 (리치 본문과 동일 취급) */
export function useDocumentFieldBlock(id: string, label: string) {
  const ctx = useRichTextToolbarOptional()
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  useEffect(() => {
    ctxRef.current?.registerFieldBlock(id, label)
  }, [id, label])

  const onActivate = useCallback(() => {
    ctxRef.current?.activateFieldBlock(id)
  }, [id])

  return { onActivate, blockLabel: label }
}
