import type { AssistantAnswerSource } from "../assistant-types"
import type { ExternalRagChunkPayload, RagChunk, RagRetrieveResult } from "./types"
import { formatRagContext } from "./retrieve"

const VALID_SOURCES = new Set<string>([
  "aggregate",
  "rag",
  "performance",
  "dashboard",
  "kanban",
  "organization",
  "ebooks",
  "survey",
  "documents",
  "help",
])

function normalizeSource(value?: string): RagChunk["source"] {
  const key = value?.trim().toLowerCase()
  if (key && VALID_SOURCES.has(key)) {
    return key as RagChunk["source"]
  }
  return "rag"
}

function mapExternalChunk(
  item: ExternalRagChunkPayload,
  index: number,
): RagChunk | null {
  const text = (item.text ?? item.content ?? item.snippet ?? "").trim()
  if (!text) return null

  return {
    id: item.id ?? `external:${index}`,
    source: normalizeSource(item.source),
    title: item.title?.trim() || `검색 결과 ${index + 1}`,
    text,
    score: item.score,
  }
}

export function isExternalRagConfigured() {
  return Boolean(process.env.RAG_API_URL?.trim())
}

export async function fetchExternalRag(
  question: string,
): Promise<RagRetrieveResult | null> {
  const url = process.env.RAG_API_URL?.trim()
  if (!url) return null

  const topK = Number(process.env.RAG_TOP_K ?? 8) || 8
  const apiKey = process.env.RAG_API_KEY?.trim()

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      question,
      query: question,
      message: question,
      top_k: topK,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`RAG API ${response.status}`)
  }

  const data = (await response.json()) as {
    chunks?: ExternalRagChunkPayload[]
    results?: ExternalRagChunkPayload[]
    context?: string
    contextText?: string
  }

  const raw = data.chunks ?? data.results ?? []
  const chunks = raw
    .map((item, index) => mapExternalChunk(item, index))
    .filter((item): item is RagChunk => item !== null)
    .slice(0, topK)

  return {
    chunks,
    contextText:
      data.contextText ??
      data.context ??
      formatRagContext(chunks),
  }
}
