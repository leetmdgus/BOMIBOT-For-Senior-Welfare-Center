/** 사업문서(실적·예산·사업계획) 인쇄 — iframe·@media print 공용 */
export const KANBAN_DOCUMENTS_PRINT_CSS = `
  @page {
    size: A4 landscape;
    margin: 8mm 10mm;
  }

  body.is-printing .print-only {
    display: block !important;
    visibility: visible !important;
  }

  body.is-printing .print-area {
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  body.is-printing .documents-print-meta {
    display: block !important;
    margin-bottom: 6mm !important;
    page-break-after: avoid;
  }

  body.is-printing .kanban-documents-report {
    overflow: visible !important;
    max-width: 100% !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  body.is-printing .kanban-documents-report table {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
    overflow: visible !important;
  }

  body.is-printing .kanban-documents-report th,
  body.is-printing .kanban-documents-report td {
    border: 1px solid #94a3b8 !important;
    padding: 2px 4px !important;
    line-height: 1.3 !important;
    vertical-align: top !important;
    word-wrap: break-word !important;
    overflow-wrap: anywhere !important;
    white-space: normal !important;
  }

  body.is-printing .kanban-documents-report thead {
    display: table-header-group !important;
  }

  body.is-printing .kanban-documents-report tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  body.is-printing .kanban-documents-report .bg-slate-700 {
    background-color: #334155 !important;
    color: #fff !important;
  }

  body.is-printing .kanban-documents-report .bg-slate-600 {
    background-color: #475569 !important;
    color: #fff !important;
  }

  body.is-printing .kanban-documents-report .bg-slate-100,
  body.is-printing .kanban-documents-report .bg-slate-50 {
    background-color: #f1f5f9 !important;
  }

  body.is-printing .kanban-documents-report .bg-sky-100 {
    background-color: #e0f2fe !important;
  }

  body.is-printing .kanban-documents-report .bg-sky-50 {
    background-color: #f0f9ff !important;
  }

  body.is-printing .kanban-documents-report .text-sky-700,
  body.is-printing .kanban-documents-report .text-sky-800 {
    color: #0369a1 !important;
  }

  body.is-printing .kanban-documents-report__stats {
    page-break-inside: avoid;
    break-inside: avoid;
    margin-bottom: 6mm !important;
    padding: 4mm !important;
  }

  body.is-printing .kanban-documents-report__stats .grid {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 6px !important;
  }

  body.is-printing .kanban-documents-report__stats h3 {
    font-size: 11pt !important;
    margin-bottom: 4mm !important;
  }

  body.is-printing .kanban-documents-report-view--performance table {
    font-size: 9pt !important;
  }

  body.is-printing .kanban-documents-report-view--budget table {
    font-size: 7.5pt !important;
  }

  body.is-printing .kanban-documents-report-view--budget th,
  body.is-printing .kanban-documents-report-view--budget td {
    padding: 1px 3px !important;
  }

  body.is-printing .kanban-documents-report-view--business-plan table {
    font-size: 8pt !important;
  }

  body.is-printing .kanban-documents-report-view--business-plan td:last-child,
  body.is-printing .kanban-documents-report-view--business-plan th:last-child {
    width: 38% !important;
  }
`

export function isKanbanDocumentsPrintArea(printArea: HTMLElement): boolean {
  return (
    printArea.classList.contains("kanban-documents-print") ||
    printArea.querySelector(".kanban-documents-report") !== null
  )
}
