import OpenAI from "openai"

import type { AssistantAnswerSource } from "./assistant-types"
import type { AssistantDataSnapshot } from "./assistant-types"
import { formatAssistantDataContext } from "./assistant-context"
import type { RagRetrieveResult } from "./rag/types"

const DEFAULT_BASE_URL = "https://factchat-cloud.mindlogic.ai/v1/gateway"
const DEFAULT_MODEL = "gemini-2.0-flash"

const VALID_SOURCES: AssistantAnswerSource[] = [
  "aggregate",
  "rag",
  "performance",
  "dashboard",
  "kanban",
  "organization",
  "ebooks",
  "survey",
  "help",
]

function createGatewayClient(): OpenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) return null

  return new OpenAI({
    apiKey,
    baseURL: process.env.GEMINI_BASE_URL?.trim() || DEFAULT_BASE_URL,
  })
}

export function isAssistantLlmConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim())
}

function parseSourcesFromAnswer(text: string): AssistantAnswerSource[] {
  const match = text.match(/\[출처:\s*([^\]]+)\]\s*$/im)
  if (!match) return ["rag"]

  const parsed = match[1]
    .split(/[·,|/]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is AssistantAnswerSource =>
      VALID_SOURCES.includes(item as AssistantAnswerSource),
    )

  return parsed.length > 0 ? parsed : ["rag"]
}

function stripSourceLine(text: string) {
  return text.replace(/\n?\[출처:\s*[^\]]+\]\s*$/im, "").trim()
}

export async function answerWithRagLlm(
  question: string,
  snapshot: AssistantDataSnapshot,
  rag: RagRetrieveResult,
): Promise<{ content: string; sources: AssistantAnswerSource[] }> {
  const client = createGatewayClient()
  if (!client) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.")
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const dataContext = formatAssistantDataContext(snapshot)

  const systemPrompt = `당신은 봄이봇(BOMIBOT) 사업관리 플랫폼의 데이터 어시스턴트입니다.
질문에 답할 때 RAG(검색 증강)로 찾은 문서 조각과 시스템 데이터를 함께 사용합니다.

규칙:
1. 「RAG 검색 결과」에 있는 문단을 우선 근거로 삼고, 필요 시 「시스템 데이터」와 대조해 답합니다. 검색 결과에 없는 수치·사실은 추측하지 말고 없다고 말합니다.
2. 사용자가 전체·요약·총괄·통합을 물으면 여러 영역을 묶어 집계해 답합니다.
3. 특정 월·세목·대시보드·칸반·설문 등을 물으면 해당 범위만 정확히 답합니다.
4. 금액은 원(₩) 단위, 천 단위 구분(,)을 사용합니다. 집행률·달성률은 필요 시 계산해 제시합니다.
5. 답변은 간결한 문단과 목록으로 구성합니다. 근거가 된 검색 문서 제목을 자연스럽게 언급할 수 있습니다.
6. 답변 맨 마지막 줄에 반드시 참고한 데이터 영역을 적습니다. 예: [출처: rag, performance, dashboard]
   사용 가능한 영역 키: aggregate, rag, performance, dashboard, kanban, organization, ebooks, survey

${rag.contextText}

=== 시스템 데이터 ===
${dataContext}`

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
  })

  const raw =
    completion.choices[0]?.message?.content?.trim() ||
    "답변을 생성하지 못했습니다. 다시 질문해 주세요."

  const ragSources = [
    ...new Set(
      rag.chunks.map((chunk) => chunk.source).filter(Boolean),
    ),
  ] as AssistantAnswerSource[]

  const parsed = parseSourcesFromAnswer(raw)

  return {
    content: stripSourceLine(raw),
    sources: [...new Set([...parsed, ...ragSources, "rag"])],
  }
}
