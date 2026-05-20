import OpenAI from "openai"

import type { AssistantAnswerSource } from "./assistant-types"
import type { AssistantDataSnapshot } from "./assistant-types"
import { formatAssistantDataContext } from "./assistant-context"
import type { GraphQueryResult } from "./ontology/types"

const DEFAULT_BASE_URL = "https://factchat-cloud.mindlogic.ai/v1/gateway"
const DEFAULT_MODEL = "gemini-2.0-flash"

const VALID_SOURCES: AssistantAnswerSource[] = [
  "aggregate",
  "ontology",
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
  if (!match) return ["aggregate"]

  const parsed = match[1]
    .split(/[·,|/]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is AssistantAnswerSource =>
      VALID_SOURCES.includes(item as AssistantAnswerSource),
    )

  return parsed.length > 0 ? parsed : ["aggregate"]
}

function stripSourceLine(text: string) {
  return text.replace(/\n?\[출처:\s*[^\]]+\]\s*$/im, "").trim()
}

export async function answerWithAssistantLlm(
  question: string,
  snapshot: AssistantDataSnapshot,
  ontologyQuery?: GraphQueryResult,
): Promise<{ content: string; sources: AssistantAnswerSource[] }> {
  const client = createGatewayClient()
  if (!client) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.")
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const dataContext = formatAssistantDataContext(snapshot)
  const ontologyContext = ontologyQuery?.contextText ?? ""

  const systemPrompt = `당신은 봄이봇(BOMIBOT) 사업관리 플랫폼의 데이터 어시스턴트입니다.
질문은 온톨로지 지식 그래프로 먼저 해석한 뒤, 아래 시스템 데이터와 대조해 답합니다.

규칙:
1. 「온톨로지 지식 그래프」의 개념·관계·추론 경로를 참고해 질문 범위를 좁힌 뒤, 「시스템 데이터」의 수치만 근거로 한국어로 답변합니다. 데이터에 없는 수치·사실은 추측하지 말고 없다고 말합니다.
2. 사용자가 전체·요약·총괄·통합을 물으면 여러 영역을 묶어 집계해 답합니다.
3. 특정 월·세목·대시보드·칸반·설문 등을 물으면 해당 범위만 정확히 답합니다.
4. 금액은 원(₩) 단위, 천 단위 구분(,)을 사용합니다. 집행률·달성률은 필요 시 계산해 제시합니다.
5. 답변은 간결한 문단과 목록으로 구성합니다. 그래프·구조·관계를 물으면 추론 경로를 요약해 설명합니다.
6. 답변 맨 마지막 줄에 반드시 참고한 데이터 영역을 적습니다. 예: [출처: ontology, performance, dashboard]
   사용 가능한 영역 키: aggregate, ontology, performance, dashboard, kanban, organization, ebooks, survey

${ontologyContext ? `${ontologyContext}\n\n` : ""}=== 시스템 데이터 ===
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

  return {
    content: stripSourceLine(raw),
    sources: parseSourcesFromAnswer(raw),
  }
}
