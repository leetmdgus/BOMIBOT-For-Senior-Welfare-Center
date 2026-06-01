import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const auth = `import { getRegionInfo } from "@/lib/auth/regions"
import {
  clearClientSession,
  getClientSession,
  setClientSession,
} from "@/lib/auth/session"
import {
  findUserByCredentials,
  registerUser,
  toAuthUser,
} from "@/lib/mocks/auth-users.mock"
import type {
  AuthSession,
  LoginRequest,
  SignupRequest,
} from "./auth.types"

function createSession(user: ReturnType<typeof toAuthUser>): AuthSession {
  const region = getRegionInfo(user.regionId)
  return {
    ...user,
    token: \`mock-token-\${user.id}-\${Date.now()}\`,
    regionLabel: region.label,
    orgName: region.orgName,
  }
}

export async function login(request: LoginRequest): Promise<AuthSession> {
  const user = findUserByCredentials(
    request.email,
    request.password,
    request.regionId,
  )

  if (!user) {
    throw new Error("\uC774\uBA54\uC77C, \uBE44\uBC00\uBC88\uD638 \uB610\uB294 \uC9C0\uC5ED\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.")
  }

  const session = createSession(toAuthUser(user))
  setClientSession(session)
  return session
}

export async function signup(request: SignupRequest): Promise<AuthSession> {
  const user = registerUser({
    email: request.email,
    password: request.password,
    name: request.name,
    department: request.department,
    regionId: request.regionId,
  })

  const session = createSession(toAuthUser(user))
  setClientSession(session)
  return session
}

export async function getSession(): Promise<AuthSession | null> {
  return getClientSession()
}

export async function logout(): Promise<void> {
  clearClientSession()
}
`

const chat = `import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"

import type {
  AssistantQuestionRequest,
  AssistantQuestionResponse,
  ChatAppConfig,
  CsTicketRequest,
  CsTicketResponse,
  OntologyGraphApiResponse,
} from "./chat.types"

/**
 * \uCC44\uBD07 UI\uC6A9 mock \uC124\uC815. \uC5B4\uC2DC\uC2A4\uD134\uD2B8/CS/\uC628\uD1A8\uB85C\uC9C0\uB294 Next API \uB77C\uC6B0\uD2B8\uB97C \uD638\uCD9C\uD569\uB2C8\uB2E4.
 */
export async function getChatConfig(regionId?: RegionId): Promise<ChatAppConfig> {
  const store = await loadRegionStore({ regionId })
  return structuredClone(store.chat.chatAppConfigMock)
}

export async function askAssistantQuestion(
  payload: AssistantQuestionRequest,
): Promise<AssistantQuestionResponse> {
  const response = await fetch("/api/chat/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? \`\uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uC694\uCCAD \uC2E4\uD328: \${response.status}\`)
  }

  return response.json()
}

export async function submitCsTicket(
  payload: CsTicketRequest,
): Promise<CsTicketResponse> {
  const response = await fetch("/api/chat/cs-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => ({}))) as CsTicketResponse & {
    error?: string
  }

  if (!response.ok) {
    throw new Error(data.error ?? \`CS \uC811\uC218 \uC2E4\uD328: \${response.status}\`)
  }

  return data
}

export async function getOntologyGraph(
  question?: string,
): Promise<OntologyGraphApiResponse> {
  const params = question?.trim()
    ? \`?q=\${encodeURIComponent(question.trim())}\`
    : ""
  const response = await fetch(\`/api/chat/ontology\${params}\`)

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? \`\uC628\uD1A8\uB85C\uC9C0 \uC870\uD68C \uC2E4\uD328: \${response.status}\`)
  }

  return response.json()
}
`

fs.writeFileSync(path.join(root, "services/auth.mock.service.ts"), auth, "utf8")
fs.writeFileSync(path.join(root, "services/chat.mock.service.ts"), chat, "utf8")
console.log("UTF-8 mock services fixed")
