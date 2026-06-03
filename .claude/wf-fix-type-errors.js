export const meta = {
  name: 'fix-remaining-type-errors',
  description: 'Analyze remaining tsc errors by subsystem and synthesize an apply-ready remediation plan',
  phases: [
    { title: 'Analyze', detail: 'one agent per subsystem cluster, read-only root-cause analysis' },
    { title: 'Synthesize', detail: 'reconcile shared-type changes into one ordered plan' },
  ],
}

const errors = `components/automation/hwpx-automation-page.tsx(205,17): TS2322 webkitDirectory attribute casing on <input> not assignable to InputHTMLAttributes
components/common/user-menu.tsx(39,15): TS2353 'role' not in Pick<Employee,"name"|"profileImage">
components/files/file-preview-dialog.tsx(203,39): TS2722 Cannot invoke possibly 'undefined'
components/files/file-preview-dialog.tsx(254,39): TS2722 Cannot invoke possibly 'undefined'
components/files/files-page-content.tsx(220,16): TS7006 Parameter 'item' implicitly any
components/files/files-page-content.tsx(223,18): TS7006 Parameter 'item' implicitly any
components/files/use-file-manager.ts(235,31): TS2349 expression not callable, '{}' has no call signatures
components/kanban/board/kanban-board-page.tsx(209,25): TS2345 'string|undefined' -> 'string'
components/kanban/board/kanban-board-page.tsx(313,45): TS18048 'task.id' possibly undefined
components/kanban/board/kanban-board-page.tsx(343,13): TS2322 'string|undefined' -> 'string'
components/kanban/board/kanban-column.tsx(101,11): TS2322 '(string|undefined)[]' -> '(UniqueIdentifier|{id})[]'
components/kanban/board/kanban-column.tsx(123,46): TS2345 'string|undefined' -> 'string'
components/kanban/board/kanban-column.tsx(128,42): TS2345 'string|undefined' -> 'string'
components/kanban/board/project-section.tsx(158,43): TS2345 'string|undefined' -> 'string'
components/kanban/board/project-section.tsx(195,24): TS2345 'string|undefined' -> 'string'
components/kanban/board/project-section.tsx(217,35): TS2345 'string|undefined' -> 'string'
components/kanban/board/project-section.tsx(238,24): TS2345 'string|undefined' -> 'string'
components/kanban/board/project-section.tsx(278,27): TS2345 'string|undefined' -> 'SetStateAction<string|null>'
components/kanban/board/project-section.tsx(279,39): TS2538 'undefined' cannot index
components/kanban/board/project-section.tsx(461,22): TS2345 'string|undefined' -> 'string'
components/kanban/board/project-section.tsx(468,35): TS2345 'string|undefined' -> 'string'
components/kanban/board/project-section.tsx(473,35): TS2345 'string|undefined' -> 'string'
components/kanban/board/project-section.tsx(595,50): TS2538 'undefined' cannot index
components/kanban/board/project-section.tsx(600,21): TS2322 'string|undefined' -> 'string'
components/kanban/board/project-section.tsx(660,32): TS2345 'string|undefined' -> 'string'
components/kanban/board/subheader.tsx(130,9): TS2322 onSubmit '(data)=>void|Promise<void>' -> '(data)=>Promise<void>'
components/kanban/board/task-card.tsx(112,5): TS2322 'string|undefined' -> 'UniqueIdentifier'
components/kanban/board/task-card.tsx(134,40): TS2345 'string|undefined' -> 'string'
components/settings/menu-management-page.tsx(81,25): TS2353 'role' not in Pick<Employee,"name"|"profileImage">
components/survey/survey-detail-page.tsx(58,48): TS2345 '{taskId:string|undefined}' -> '((RegionId)&{taskId?})|undefined'
components/survey/survey-editor.tsx(150,59): TS2345 '{taskId:string|undefined}' -> '((RegionId)&{taskId?})|undefined'
components/survey/survey-editor.tsx(309,11): TS2322 Dispatch<SetStateAction<SurveyBasicInfo>> -> Dispatch<SetStateAction<{title;description;category?;status}>>
lib/chat/assistant-rag-llm.ts(109,5): TS2322 'string[]' -> 'AssistantAnswerSource[]'
lib/chat/cs-email.ts(47,59): TS1501 regex flag only available es2018+ (tsconfig target ES6)
lib/chat/ontology/build-graph.ts(174,9): TS2322 'string|undefined' -> 'string|number|boolean'
lib/chat/ontology/build-graph.ts(175,9): TS2322 'string|undefined' -> 'string|number|boolean'
lib/chat/ontology/build-graph.ts(194,34): TS2339 'completedCount' not on type 'Task'
lib/chat/ontology/build-graph.ts(195,30): TS2339 'totalCount' not on type 'Task'
lib/chat/ontology/build-graph.ts(231,22): TS2339 'author' not on type 'Book'
lib/chat/ontology/build-graph.ts(248,11): TS2322 'number|undefined' -> 'string|number|boolean'
lib/chat/ontology/build-graph.ts(249,11): TS2322 'number|undefined' -> 'string|number|boolean'
lib/files/build-folder-zip.ts(28,13): TS7022 'parentId' implicitly any (recursive initializer)
lib/mocks/kanban.board.mock.ts(58,11): TS2322 'string|undefined' -> 'string'
lib/mocks/kanban.board.mock.ts(59,11): TS2322 'string|undefined' -> 'string'
lib/mocks/kanban.board.mock.ts(93,24): TS2339 'totalCount' not on type 'Task'
lib/mocks/kanban.board.mock.ts(105,7): TS2353 'completedCount' not in type 'Task'
lib/mocks/kanban.board.mock.ts(127,5): TS2353 'completedCount' not in type 'Task'
lib/mocks/kanban.board.mock.ts(128,27): TS2339 'totalCount' not on type 'Task'
lib/mocks/kanban.board.mock.ts(171,13),(186,13),(201,13),(216,13),(242,13),(257,13),(295,13),(310,13): TS2353 'completedCount' not in type 'Task' (mock task literals)
lib/rich-text-font-size.ts(29,7): TS2322 number-literal union -> '7'
services/chat.mock.service.ts(29,3): TS2322 config object -> 'ChatAppConfig'
services/chat.mock.service.ts(59,51): TS2339 'subject' not on 'CsTicketRequest'
services/dashboard.mock.service.ts(19,5): TS2322 -> 'CalendarEvent[]'
services/dashboard.mock.service.ts(20,5): TS2322 -> 'VolunteerEvent[]'
services/ebooks.mock.service.ts(31,5): TS2322 -> 'Book[]'
services/ebooks.mock.service.ts(32,5): TS2322 'string[]' -> 'Category[]'
services/ebooks.mock.service.ts(40,3): TS2322 'string[]' -> 'Category[]'
services/files.mock.service.ts(28,33): TS2345 inferred array -> 'FileItem[]'
services/files.mock.service.ts(120,5): TS2322 'FileItem[]' -> inferred array
services/files.mock.service.ts(269,12): TS2352 'Record<string,unknown>' -> 'FileItem' may be a mistake
services/kanban.board.api.service.ts(127,35): TS2339 'completedCount' not on 'Partial<Task>'
services/kanban.board.api.service.ts(128,31): TS2339 'totalCount' not on 'Partial<Task>'
services/kanban.board.mock.service.ts(28,35): TS2345 inferred projects -> 'KanbanProject[]'
services/kanban.board.mock.service.ts(60,5): TS7053 string index into fixed-key object
services/kanban.board.mock.service.ts(96,24): TS2339 'createDefaultProjectCategories' not on store object
services/kanban.board.mock.service.ts(111,28): TS2345 'KanbanProject' -> inferred project shape
services/kanban.board.mock.service.ts(128,3): TS2322 categories union mismatch
services/kanban.board.mock.service.ts(133,3): TS2322 inferred project -> 'KanbanProject'
services/kanban.board.mock.service.ts(169,23): TS2345 'Task' -> inferred task shape
services/kanban.documents.mock.service.ts(29,54): TS2339 'items' not on businessPlan object
services/kanban.documents.mock.service.ts(30,10): TS7006 'item' implicitly any
services/kanban.documents.mock.service.ts(43,5): TS2322 -> 'PerformanceReportRow[]'
services/kanban.documents.mock.service.ts(44,5): TS2322 -> 'BudgetReportRow[]'
services/kanban.documents.service.ts(31,7): TS2322 service module union -> 'KanbanDocumentsService'
services/kanban.performance.mock.service.ts(55,39): TS2345 -> 'PerformanceRow[]'
services/kanban.version-history.mock.service.ts(41,44): TS2345 'string' -> RegionId
services/kanban.version-history.mock.service.ts(45,27): TS2345 'string' -> RegionId
services/kanban.version-history.mock.service.ts(54,44): TS2345 'string' -> RegionId|undefined
services/kanban.version-history.mock.service.ts(61,24): TS2345 -> 'VersionHistoryEntry[]'
services/kanban.version-history.mock.service.ts(69,44): TS2345 'string' -> RegionId|undefined
services/survey.mock.service.ts(36,37): TS2345 'string' -> RegionId
services/survey.mock.service.ts(40,7): TS2322 Map detail -> 'Map<string,SurveyDetail>'
services/survey.mock.service.ts(44,25): TS2345 'string' -> RegionId
services/survey.mock.service.ts(70,5): TS2322 -> 'SurveyListItem[]'
services/survey.mock.service.ts(74,15),(78,20),(85,20),(118,18),(126,5),(164,3),(173,20),(175,5),(210,18),(212,3): TS18048 'runtime' possibly undefined
services/survey.mock.service.ts(102,25): TS2345 union -> 'SurveyListItem'
services/survey.mock.service.ts(125,52): TS2345 -> 'SurveyListItem'
services/survey.mock.service.ts(181,7): TS2322 'SurveyListItem' -> union
services/survey.mock.service.ts(183,21): TS2345 'SurveyListItem' -> union
services/survey.mock.service.ts(235,19): TS7053 string index into fixed-key responses object`

const CLUSTERS = [
  { name: 'board', files: ['frontend-next/services/kanban.board.types.ts', 'frontend-next/lib/mocks/kanban.board.mock.ts', 'frontend-next/services/kanban.board.mock.service.ts', 'frontend-next/services/kanban.board.api.service.ts', 'frontend-next/components/kanban/board/kanban-board-page.tsx', 'frontend-next/components/kanban/board/kanban-column.tsx', 'frontend-next/components/kanban/board/project-section.tsx', 'frontend-next/components/kanban/board/task-card.tsx', 'frontend-next/components/kanban/board/subheader.tsx'] },
  { name: 'survey', files: ['frontend-next/services/survey.mock.service.ts', 'frontend-next/components/survey/survey-editor.tsx', 'frontend-next/components/survey/survey-detail-page.tsx'] },
  { name: 'chat', files: ['frontend-next/lib/chat/ontology/build-graph.ts', 'frontend-next/lib/chat/cs-email.ts', 'frontend-next/lib/chat/assistant-rag-llm.ts', 'frontend-next/services/chat.mock.service.ts'] },
  { name: 'other-mock-services', files: ['frontend-next/services/kanban.version-history.mock.service.ts', 'frontend-next/services/kanban.documents.mock.service.ts', 'frontend-next/services/kanban.documents.service.ts', 'frontend-next/services/kanban.performance.mock.service.ts', 'frontend-next/services/dashboard.mock.service.ts', 'frontend-next/services/ebooks.mock.service.ts'] },
  { name: 'files', files: ['frontend-next/services/files.mock.service.ts', 'frontend-next/components/files/files-page-content.tsx', 'frontend-next/components/files/file-preview-dialog.tsx', 'frontend-next/components/files/use-file-manager.ts', 'frontend-next/lib/files/build-folder-zip.ts'] },
  { name: 'misc', files: ['frontend-next/components/common/user-menu.tsx', 'frontend-next/components/settings/menu-management-page.tsx', 'frontend-next/lib/rich-text-font-size.ts', 'frontend-next/components/automation/hwpx-automation-page.tsx'] },
]

const FIX_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cluster', 'rootCauses', 'edits', 'sharedTypeChanges'],
  properties: {
    cluster: { type: 'string' },
    rootCauses: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['summary', 'errorsCovered'], properties: { summary: { type: 'string' }, errorsCovered: { type: 'number' } } } },
    edits: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'change', 'rationale'], properties: { file: { type: 'string' }, location: { type: 'string' }, change: { type: 'string' }, rationale: { type: 'string' }, risk: { type: 'string' } } } },
    sharedTypeChanges: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'change', 'rationale'], properties: { file: { type: 'string' }, change: { type: 'string' }, rationale: { type: 'string' }, affectedSites: { type: 'string' } } } },
  },
}

const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sharedTypeChanges', 'orderedEdits', 'conflicts', 'notes'],
  properties: {
    sharedTypeChanges: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'change', 'rationale', 'risk'], properties: { file: { type: 'string' }, change: { type: 'string' }, rationale: { type: 'string' }, risk: { type: 'string' } } } },
    orderedEdits: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'change', 'rationale'], properties: { file: { type: 'string' }, location: { type: 'string' }, change: { type: 'string' }, rationale: { type: 'string' }, risk: { type: 'string' } } } },
    conflicts: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
}

const plans = await parallel(
  CLUSTERS.map((c) => () =>
    agent(
      `You are a TypeScript expert fixing strict-mode compile errors in the BOMIBOT Next.js frontend. The repo root is the cwd; frontend code lives under frontend-next/, so read files at the exact paths below.
Work on the "${c.name}" subsystem only. Your files:
${c.files.map((f) => '  - ' + f).join('\n')}

FULL tsc error list (strict, target ES6) — use the lines for YOUR files:
-----
${errors}
-----

READ-ONLY analysis — do NOT edit files, do NOT run tsc (it OOMs here).
1. Read each erroring file AND the type definitions it depends on (frontend-next/services/*.types.ts, frontend-next/lib/mocks/region-store.types.ts, frontend-next/lib/auth/regions.ts, etc.).
2. Find ROOT CAUSES (e.g. Task interface missing completedCount/totalCount; KanbanProject/Category/Task.id optional but used as required; region-store JSON-inferred types too loose so store.regionId is 'string'; mock data widened by JSON.parse). Prefer fixing the root cause once over many band-aids.
3. For each fix give: file, location (symbol/line), precise change with before/after snippets, rationale, and runtime "risk".
4. Put changes to SHARED type/interface files (services/kanban.board.types.ts, region-store.types.ts, *.types.ts) under "sharedTypeChanges" with the other sites they affect; keep changes confined to your files under "edits".
Be exact and behavior-preserving. Never weaken with broad \`any\`. Do not invent files.`,
      { label: `analyze:${c.name}`, phase: 'Analyze', schema: FIX_SCHEMA },
    ),
  ),
)

const valid = plans.filter(Boolean)
log(`collected ${valid.length}/${CLUSTERS.length} cluster plans`)

const synth = await agent(
  `You are the lead engineer. Merge these per-subsystem TypeScript fix plans into ONE apply-ready remediation plan for the BOMIBOT frontend.

Per-subsystem plans (JSON):
${JSON.stringify(valid, null, 2)}

Requirements:
- Reconcile "sharedTypeChanges" across clusters (e.g. board + chat both need Task.completedCount/totalCount; board mock + components both depend on id optionality). Choose ONE canonical change per shared symbol and explain why. List canonical shared-type edits under "sharedTypeChanges" — applied FIRST.
- Then list "orderedEdits" (per-file) to apply after shared-type changes.
- Flag "conflicts" where clusters disagreed and how resolved.
- In "notes": overall strategy, behavioral/runtime risks, and which edits most need manual sanity checks.
- Prefer required-field / precise-type fixes where runtime always supplies the value; use guards/casts only where genuinely optional. No broad \`any\`.`,
  { phase: 'Synthesize', schema: SYNTH_SCHEMA },
)

return synth
