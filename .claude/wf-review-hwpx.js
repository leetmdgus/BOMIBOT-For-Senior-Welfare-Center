export const meta = {
  name: 'review-hwpx-roundtrip',
  description: 'Adversarial review of the HWPX 절대보존 round-trip writeback feature (backend + frontend)',
  phases: [
    { title: 'Review', detail: 'parallel reviewers per dimension' },
    { title: 'Verify', detail: 'adversarially refute each finding against the code' },
    { title: 'Synthesize', detail: 'prioritized report' },
  ],
}

const CONTEXT = `
Feature: a "절대 보존"(absolute-preservation) HWPX round-trip editor.
Goal: a user edits an uploaded .hwpx in the browser; on download the file must NOT break in 한글(Hancom). Strategy: keep every original ZIP entry byte-identical and only replace Contents/section0.xml (and Contents/header.xml / Contents/content.hpf only when fonts/colors/images are added, plus new BinData/* entries).

Key files:
- backend/app/application/hwpx/automation/section0_writeback.py — the writeback engine. export_hwpx_preserving(hwpx_bytes, frontend_json): reads section0.xml/header.xml/content.hpf, applies edits via lxml (preserving hp:/hh:/hc: namespace prefixes), strips invalidated hp:linesegarray, and repacks via pack_hwpx_zip_bytes. HeaderEditor adds (never mutates) charPr (size/textColor/bold/italic) and borderFill (cell background hc:fillBrush/winBrush), bumping itemCnt. Images: _build_image_paragraph parses a data URL, registers BinData via HwpxImageCatalog, builds hp:pic. Matching: top-level paragraphs by order (excluding table-internal p), runs by run_index, table cells by (rowAddr,colAddr); new isNew-image paragraphs are inserted.
- backend/app/application/hwpx/zip_package.py — pack_hwpx_zip_bytes gained allow_template_paths to permit replacing normally-protected header.xml/content.hpf when references are kept consistent.
- frontend-next/lib/hwpx/frontend-render-types.ts — the edit-JSON contract + pure mutators (updateRunText/Style, updateCellRunText/Style, updateCellBackground, appendTableAfterParagraph, appendImageParagraph) and HwpxTextRunStyle.
- frontend-next/components/automation/hwpx-editor-panel.tsx — the editor UI calling those mutators.

Verified already (Python): unchanged round-trip is byte-identical across 7 templates; text/size/color/bold/italic/cell-bg/image/FONT-FACE edits change only the expected entries (section0 + header + content.hpf/BinData for images) and reparse. Font-face: HeaderEditor.resolve_font reuses an existing face id or appends a new <hh:font> to all 7 <hh:fontface> lists (same id, fontCnt bumped) and sets the new charPr fontRef. NOT yet implemented: new-table creation. 한글(Hancom) open-verification is still pending — focus on whether any generated XML (charPr/borderFill/font/binData/pic placement) could be rejected by 한글.
`

const FINDINGS_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['dimension', 'findings'],
  properties: {
    dimension: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'severity', 'file', 'title', 'detail'],
        properties: {
          id: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'nit'] },
          file: { type: 'string' }, location: { type: 'string' },
          title: { type: 'string' }, detail: { type: 'string' }, suggestion: { type: 'string' },
        },
      },
    },
  },
}
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['real', 'confidence', 'reasoning'],
  properties: {
    real: { type: 'boolean' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string' }, correctedSeverity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'nit'] },
  },
}
const REPORT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['summary', 'findings', 'topRisks'],
  properties: {
    summary: { type: 'string' },
    topRisks: { type: 'array', items: { type: 'string' } },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['severity', 'file', 'title', 'detail'],
        properties: {
          severity: { type: 'string' }, file: { type: 'string' }, location: { type: 'string' },
          title: { type: 'string' }, detail: { type: 'string' }, suggestion: { type: 'string' },
        },
      },
    },
  },
}

const DIMENSIONS = [
  { key: 'hwpx-schema', focus: 'HWPX/OWPML schema correctness in section0_writeback.py and hwpx_image_embed reuse: charPr child order (italic,bold before underline), borderFill hc:fillBrush placement (after diagonal), binDataList placement (is inserting it before </hh:refList> — i.e. as last child of refList — actually valid OWPML? where SHOULD binDataList go?), itemCnt correctness, hp:pic structure, namespace prefixes (hp/hh/hc), XML declaration preservation. Flag anything 한글 might reject.' },
  { key: 'ref-consistency', focus: 'Reference/ID consistency & byte-preservation in section0_writeback.py + zip_package.py: dangling charPrIDRef/borderFillIDRef/binaryItemIDRef, new-id collisions (max+1 logic), itemCnt vs actual count, the allow_template_paths change not breaking other pack_hwpx_zip_bytes callers, that unchanged docs stay byte-identical, linesegarray stripping side effects.' },
  { key: 'matching-edge', focus: 'Edit matching & edge cases in section0_writeback.py: top-level-paragraph collection vs the parser, run_index alignment, table cell (row,col) matching, new-image-paragraph insertion position (addnext/addprevious/parent), multiple tables per paragraph, empty docs, _set_run_text rebuilding t/lineBreak/tab (lost non-text run children? charPr loss?), paragraphs count mismatch between JSON and XML.' },
  { key: 'frontend-contract', focus: 'Frontend mutators + editor (frontend-render-types.ts, hwpx-editor-panel.tsx) and contract consistency with the backend: do the mutators produce exactly what the backend consumes (style fields names, cell row/col, isNew, dataUrl)? immutability/index correctness, the editor exposing font-face & 표추가 that the backend silently drops (UX trap), cell editor only touching first text_run.' },
]

const reviewed = await pipeline(
  DIMENSIONS,
  (d) => agent(
    `${CONTEXT}\nYou are a meticulous reviewer. Dimension: ${d.key}.\nFocus: ${d.focus}\nRead the cited files (repo root cwd; backend/ and frontend-next/ paths). Report only concrete, code-grounded issues with file+location. If a concern turns out fine after reading, don't report it. Assign stable ids like ${d.key.slice(0,2)}-1.`,
    { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA },
  ),
  (review, dim) => parallel((review?.findings ?? []).map((f) => () =>
    agent(
      `Adversarially verify this HWPX-feature review finding. Try to REFUTE it by reading the actual code. Default real=false if you cannot confirm from the code.\n${CONTEXT}\nFinding: ${JSON.stringify(f)}`,
      { label: `verify:${f.id ?? dim.key}`, phase: 'Verify', schema: VERDICT_SCHEMA },
    ).then((v) => ({ ...f, dimension: dim.key, verdict: v })),
  )),
)

const confirmed = reviewed.flat().filter(Boolean)
  .filter((f) => f.verdict?.real)
  .map((f) => ({ ...f, severity: f.verdict?.correctedSeverity ?? f.severity }))

const report = await agent(
  `Synthesize a prioritized review report for the HWPX 절대보존 writeback feature from these adversarially-confirmed findings (false positives dropped):\n${JSON.stringify(confirmed, null, 2)}\nOrder by severity, write a crisp summary and a topRisks list (things to fix before relying on 한글 output).`,
  { phase: 'Synthesize', schema: REPORT_SCHEMA },
)

return { confirmedCount: confirmed.length, report }
