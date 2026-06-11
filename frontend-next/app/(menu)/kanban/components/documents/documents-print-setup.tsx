"use client"

import { usePrintDocument } from "@common/components/print-document"

/** 사업문서 허브 — 인쇄 시 body.is-printing 트리거 */
export function DocumentsPrintSetup() {
  usePrintDocument()
  return null
}
