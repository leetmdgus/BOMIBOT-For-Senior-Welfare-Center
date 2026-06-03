export const meta = {
  name: 'review-pending-diff',
  description: 'Full code review of the pending branch diff (frontend + backend + new files) with adversarial verification',
  phases: [
    { title: 'Review', detail: 'one reviewer per file-group over the pending diff' },
    { title: 'Verify', detail: 'adversarially refute each finding' },
    { title: 'Synthesize', detail: 'prioritized report from confirmed findings' },
  ],
}

const GROUPS = [
  {
    key: 'backend-automation',
    desc: 'Backend Python — HWPX automation service, evidence analyzer, automation API endpoints, main.py, config.py',
    paths: 'backend/app/application/hwpx/automation/ backend/app/interfaces/api/v1/automation.py backend/app/main.py backend/app/core/config.py',
    untracked: 'backend/app/application/hwpx/automation/evidence_analyzer.py',
  },
  {
    key: 'frontend-automation',
    desc: 'Frontend automation feature — automation page, document preview panel, evidence tree, automation services + lib',
    paths: 'frontend-next/components/automation/ frontend-next/services/automation.api.service.ts frontend-next/services/automation.mock.service.ts frontend-next/services/automation.service.ts',
    untracked: 'frontend-next/components/automation/document-preview-panel.tsx frontend-next/components/automation/evidence-document-tree.tsx frontend-next/lib/automation/document-analysis-types.ts frontend-next/lib/automation/document-tree.ts',
  },
  {
    key: 'frontend-task-detail-hwpx',
    desc: 'Kanban task-detail + HWPX changes (section types, editors, preview rendering)',
    paths: 'frontend-next/components/kanban/ frontend-next/lib/kanban/ frontend-next/lib/hwpx/ frontend-next/lib/hwp-ast/ frontend-next/components/hwpx/ frontend-next/app/hwpx-document.css frontend-next/services/kanban.task-detail.mock.service.ts',
    untracked: '',
  },
  {
    key: 'frontend-infra',
    desc: 'Frontend infra — api-client, next.config, package.json, auth google callback, collaboration room, files page, dashboard, service worker',
    paths: 'frontend-next/lib/api-client.ts frontend-next/next.config.mjs frontend-next/package.json frontend-next/app/auth/ frontend-next/lib/collaboration/ frontend-next/app/files/page.tsx frontend-next/components/dashboard/ frontend-next/components/dev/ frontend-next/components/kanban/board/new-project-modal.tsx',
    untracked: '',
  },
  {
    key: 'frontend-survey',
    desc: 'Survey response form and results',
    paths: 'frontend-next/components/survey/',
    untracked: '',
  },
  {
    key: 'config-env-docs',
    desc: 'Env files, docker-compose, Dockerfile, deploy/dev scripts, CI workflows, docs',
    paths: 'frontend-next/.env frontend-next/.env.example frontend-next/.env.local.example backend/.env.example backend/.env.docker.example backend/.env.docker.local.example backend/docker-compose.yml backend/Dockerfile backend/scripts/ scripts/ docs/ .github/ README.md QUICKSTART.md',
    untracked: '',
  },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['group', 'findings'],
  properties: {
    group: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'severity', 'category', 'file', 'title', 'detail'],
        properties: {
          id: { type: 'string', description: 'short stable id e.g. be-1' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'nit'] },
          category: { type: 'string', enum: ['correctness', 'security', 'runtime', 'performance', 'quality', 'config'] },
          file: { type: 'string' },
          location: { type: 'string', description: 'line range or symbol' },
          title: { type: 'string' },
          detail: { type: 'string', description: 'what is wrong and why it matters' },
          suggestion: { type: 'string', description: 'concrete fix' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['real', 'confidence', 'reasoning'],
  properties: {
    real: { type: 'boolean', description: 'true if the issue is genuinely a problem after scrutiny' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string' },
    correctedSeverity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'nit'] },
  },
}

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'byGroup', 'topRisks'],
  properties: {
    summary: { type: 'string' },
    topRisks: { type: 'array', items: { type: 'string' } },
    byGroup: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['group', 'findings'],
        properties: {
          group: { type: 'string' },
          findings: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['severity', 'category', 'file', 'title', 'detail'],
              properties: {
                severity: { type: 'string' },
                category: { type: 'string' },
                file: { type: 'string' },
                location: { type: 'string' },
                title: { type: 'string' },
                detail: { type: 'string' },
                suggestion: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
}

const reviewed = await pipeline(
  GROUPS,
  (g) =>
    agent(
      `You are a senior code reviewer reviewing the PENDING (uncommitted) git diff of the BOMIBOT repo for this group:
GROUP: ${g.key} — ${g.desc}

How to see the changes:
- Run: git -c core.quotepath=false diff HEAD -- ${g.paths}
- New untracked files in this group (NOT in the diff — read them in full with the Read tool): ${g.untracked || '(none)'}
- Read surrounding context in the files as needed.

Review for, in priority order:
1) SECURITY — hardcoded secrets/tokens/keys committed to env files or code, injection (SQL/command/path), missing authz/authn, unsafe CORS, SSRF, unsafe deserialization, secrets in logs.
2) CORRECTNESS — logic bugs, wrong conditionals, off-by-one, unhandled null/undefined, race conditions, incorrect async/await, broken error handling.
3) RUNTIME — crashes, unhandled promise rejections, missing awaits, resource leaks.
4) PERFORMANCE — needless O(n^2), blocking calls, missing memoization on hot paths.
5) QUALITY/CONFIG — dead code, misconfig, fragile patterns.

Only report genuine issues you can point to a specific file+location for. Do not pad with style nits unless they cause bugs. Assign a stable short id per finding (prefix by group, e.g. ${g.key.slice(0, 2)}-1). If the group looks clean, return an empty findings array.`,
      { label: `review:${g.key}`, phase: 'Review', schema: FINDINGS_SCHEMA },
    ),
  (review, group) =>
    parallel(
      (review?.findings ?? []).map((f) => () =>
        agent(
          `Adversarially verify this code-review finding for the BOMIBOT repo. Try hard to REFUTE it: open the cited file (git diff HEAD -- <file> and/or Read), check the surrounding code, and decide whether it is a REAL problem or a false positive. Default to real=false if you cannot confirm it from the actual code.

Finding: ${JSON.stringify(f)}`,
          { label: `verify:${f.id ?? group.key}`, phase: 'Verify', schema: VERDICT_SCHEMA },
        ).then((v) => ({ ...f, group: group.key, verdict: v })),
      ),
    ),
)

const confirmed = reviewed
  .flat()
  .filter(Boolean)
  .filter((f) => f.verdict?.real)
  .map((f) => ({ ...f, severity: f.verdict?.correctedSeverity ?? f.severity }))

const report = await agent(
  `You are the review lead. Produce a prioritized code-review report for the BOMIBOT pending diff from these ADVERSARIALLY-CONFIRMED findings (false positives already dropped):

${JSON.stringify(confirmed, null, 2)}

Group findings by their "group", order each group's findings by severity (critical→nit), and write a crisp top-level summary plus a "topRisks" list (the 3-7 things the author should fix before merge). Keep details actionable.`,
  { phase: 'Synthesize', schema: REPORT_SCHEMA },
)

return { confirmedCount: confirmed.length, report }
