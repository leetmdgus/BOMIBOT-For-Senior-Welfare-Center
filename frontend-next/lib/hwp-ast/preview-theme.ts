/** HWPX 미리보기 — backend preview_theme.py 와 동기화 */



export const HWPX_PREVIEW_THEME_CSS = `

.hwpx-page-root {

  display: flex;

  justify-content: center;

  background: #e8e8e8;

  padding: 16px;

  min-height: 100%;

  box-sizing: border-box;

}

.hwpx-page {

  background: #fff;

  box-shadow: 0 2px 12px rgb(0 0 0 / 0.08);

  box-sizing: border-box;

  color: #111;

  font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", "Pretendard", system-ui, sans-serif;

  font-size: 10pt;

  line-height: 1.48;

}

.hwpx-page-header,

.hwpx-page-footer {

  display: none;

}

.hwpx-page-body {

  min-height: 0;

}

.hwpx-doc,

.hwpx-doc--preview {

  width: 100%;

  color: #111;

  font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", "Pretendard", system-ui, sans-serif;

  font-size: 10pt;

  line-height: 1.48;

}

.hwpx-doc__title {

  margin: 0 0 0.5rem;

  border-bottom: 1px solid #000;

  padding: 0.65rem 0.5rem 0.55rem;

  text-align: center;

  letter-spacing: 0.05em;

}

.hwpx-doc__title--template {

  font-size: inherit;

  font-weight: inherit;

}

.hwpx-doc__title--template span {

  white-space: pre-wrap;

}

.hwpx-page-body .hwpx-doc__table-wrap,

.hwpx-doc .hwpx-doc__table-wrap,

.office-preview .hwpx-doc__table-wrap {

  width: 100%;

  overflow-x: auto;

  margin: 0;

}

.hwpx-page-body .hwpx-doc__table,

.hwpx-page-body .hwp-ast-table,

.hwpx-doc .hwpx-doc__table,

.office-preview .hwpx-doc__table,

.office-preview table.hwpx-doc__table {

  width: 100%;

  border-collapse: collapse;

  table-layout: fixed;

  margin: 0;

  line-height: 1.48;

}

.hwpx-page-body .hwpx-doc__table td,

.hwpx-page-body .hwpx-doc__table th,

.hwpx-page-body .hwp-ast-table td,

.hwpx-page-body .hwp-ast-table th,

.hwpx-doc .hwpx-doc__table td,

.hwpx-doc .hwpx-doc__table th,

.office-preview .hwpx-doc__table td,

.office-preview .hwpx-doc__table th {

  border: 1px solid #000;

  padding: 5px 8px;

  vertical-align: top;

  word-break: keep-all;

  overflow-wrap: anywhere;

}

.hwpx-doc--preview .hwpx-doc__table td span[style],

.hwpx-doc--preview .hwpx-doc__table th span[style] {

  line-height: inherit;

}

.hwpx-doc__table--cols-4 .hwpx-doc__label,

.hwpx-doc__table--cols-4 .hwpx-doc__sublabel {

  width: auto;

  min-width: 0;

  max-width: none;

}

.hwpx-doc__table--cols-4 .hwpx-doc__label,

.hwpx-doc__table--cols-4 .hwpx-doc__sublabel {

  vertical-align: middle;

}

.hwpx-doc__table--cols-4 .hwpx-doc__band {

  width: auto;

  min-width: 0;

  max-width: none;

}

.hwpx-doc--preview td.hwpx-doc__label,

.hwpx-doc--preview th.hwpx-doc__label {

  background-color: #ececec;

}

.hwpx-doc--preview td.hwpx-doc__sublabel,

.hwpx-doc--preview th.hwpx-doc__sublabel {

  background-color: #f3f3f3;

}

.hwpx-doc--preview td.hwpx-doc__band,

.hwpx-doc--preview th.hwpx-doc__band {

  background-color: #ececec;

}

.hwpx-doc--preview td.hwpx-doc__value,

.hwpx-doc--preview th.hwpx-doc__value {

  background-color: #fff;

}

.hwpx-page-body .hwpx-doc__label,

.hwpx-doc .hwpx-doc__label,

.office-preview .hwpx-doc__label,

.office-preview th.hwpx-doc__label {

  width: 6.5rem;

  min-width: 6.5rem;

  max-width: 28%;

  text-align: center;

  white-space: normal;

  line-height: 1.35;

}

.hwpx-page-body .hwpx-doc__sublabel,

.hwpx-doc .hwpx-doc__sublabel {

  text-align: center;

}

.hwpx-page-body .hwpx-doc__band,

.hwpx-doc .hwpx-doc__band {

  text-align: center;

  padding: 6px 8px;

}

.hwpx-page-body p,

.hwpx-doc p,

.office-preview.hwpx-like p {

  margin: 0;

  white-space: pre-wrap;

}

.hwpx-page-body .hwpx-doc__table td p,

.hwpx-page-body .hwpx-doc__table th p {

  margin: 0;

}

`



export const OFFICE_HWPX_PREVIEW_CSS = `

.office-preview.hwpx-like {

  font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", "Pretendard", system-ui, sans-serif;

  font-size: 10pt;

  line-height: 1.48;

  color: #111;

}

.office-preview.hwpx-like .office-preview-title {

  border-bottom: 1px solid #000;

  padding-bottom: 0.5rem;

  text-align: center;

  letter-spacing: 0.15em;

  font-size: 1.08rem;

}

`

