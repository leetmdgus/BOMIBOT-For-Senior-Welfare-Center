/** 한글(한컴) 사업계획서·평가서 본문 양식 HTML */

export const ROMAN_CHAPTER_MARKERS = [
  "Ⅰ",
  "Ⅱ",
  "Ⅲ",
  "Ⅳ",
  "Ⅴ",
  "Ⅵ",
  "Ⅶ",
  "Ⅷ",
  "Ⅸ",
  "Ⅹ",
] as const

const th =
  'class="border border-black bg-[#e6e6e6] p-2 text-center text-[10px] font-semibold"'
const td =
  'class="border border-black bg-white p-2 align-top text-[10px] leading-relaxed"'
const tdCenter =
  'class="border border-black bg-white p-2 text-center align-middle text-[10px] font-medium"'
const tdNum =
  'class="border border-black bg-white p-2 text-right align-middle text-[10px] doc-num"'

export function formalChapterHtml(
  title = "사업의 배경 및 필요성",
  romanIndex = 1,
): string {
  const mark = ROMAN_CHAPTER_MARKERS[romanIndex - 1] ?? ROMAN_CHAPTER_MARKERS[0]
  return `<h2 class="doc-chapter">${mark}. ${title}</h2><p><br></p>`
}

export function formalSectionHtml(title = "대상자 욕구 및 문제점", num = 1): string {
  return `<h3 class="doc-section">${num}. ${title}</h3><p><br></p>`
}

/** 밑줄 없는 번호 소제목 (예: 4. 실인원수) */
export function formalPlainSectionHtml(title = "실인원수", num = 4): string {
  return `<h3 class="doc-section-plain">${num}. ${title}</h3><p><br></p>`
}

export function formalBulletLeadHtml(text = "전년도 사업평가"): string {
  return `<p class="doc-bullet">● ${text}</p><p><br></p>`
}

export function formalBodyHtml(
  text = "본문을 입력하세요. 통계·근거를 인용할 때는 괄호로 출처를 표기합니다.",
): string {
  return `<p class="doc-body">${text}</p><p><br></p>`
}

/** 실인원수 3열 표 + 각주 */
export function formalStaffCountTableHtml(): string {
  const rows = [
    {
      num: "①",
      label: "신규회원 이용상담",
      basis: "월 80명 × 12개월",
      count: "960*",
    },
    {
      num: "②",
      label: "신규회원 가입",
      basis: "월 80명 × 12개월",
      count: "960**",
    },
    {
      num: "③",
      label: "신규회원 교육",
      basis: "월 80명 × 12개월 × 90%",
      count: "960**",
    },
    {
      num: "④",
      label: "정보제공상담",
      basis: "월 80명 × 1개월",
      count: "80***",
    },
  ]
    .map(
      (r) => `<tr>
<td ${tdCenter}><span class="doc-cell-num">${r.num}</span> ${r.label}</td>
<td ${td}>${r.basis}</td>
<td ${tdNum}>${r.count}</td>
</tr>`,
    )
    .join("")

  return `<table class="bp-rt-table bp-formal-table bp-staff-table w-full border-collapse border border-black text-[10px] my-2"><colgroup><col style="width:28%"><col style="width:52%"><col style="width:20%"></colgroup>
<thead><tr>
<th ${th}>대상구분</th><th ${th}>서비스대상자 산출근거</th><th ${th}>단위수(명)</th>
</tr></thead><tbody>${rows}</tbody></table>
<p class="doc-footnote">* 신규회원 이용상담 산출 내역을 입력하세요.</p>
<p class="doc-footnote">** 신규회원 가입·교육 산출 내역을 입력하세요.</p>
<p class="doc-footnote">*** 정보제공상담 산출 내역을 입력하세요.</p>
<p><br></p>`
}

/** 본문용 목적·목표 병합 표 (표 블록과 동일 레이아웃) */
export function formalPurposeGoalsTableHtml(): string {
  const bl = (items: string[]) =>
    `<ul class="doc-goal-list">${items.map((b) => `<li>${b}</li>`).join("")}</ul>`
  const out = (title: string, items: string[]) =>
    `<p class="doc-goal-title"><strong>${title}</strong></p>${bl(items)}`

  return `<table class="bp-rt-table bp-formal-table bp-goals-table w-full border-collapse border border-black text-[10px] my-3"><colgroup><col style="width:22%"><col style="width:39%"><col style="width:39%"></colgroup>
<thead>
<tr><th ${th} rowspan="2">목적</th><th ${th} colspan="2">목표</th></tr>
<tr><th ${th}>산출목표</th><th ${th}>성과목표</th></tr>
</thead>
<tbody>
<tr>
<td ${tdCenter} rowspan="4" class="doc-purpose-cell">개별 욕구에 적합한 상담으로 정보 및 복지서비스를 제공하여 건강하고 안정적인 노후 생활을 지원합니다.</td>
<td ${td}>${out("신규회원 이용상담 (960명 / 960회)", ["상반기 80명×6개월=480명 / 480회", "하반기 80명×6개월=480명 / 480회"])}</td>
<td ${td} rowspan="2">초기상담을 통한 이용자 편리성 증진</td>
</tr>
<tr>
<td ${td}>${out("신규회원 가입 (960명 / 960회)", ["상반기 80명×6개월=480명 / 480회", "하반기 80명×6개월=480명 / 480회"])}</td>
</tr>
<tr>
<td ${td}>${out("신규회원 교육 (960명 / 960회)", ["상반기 80명×6개월×90%=432명 / 432회", "하반기 80명×6개월×90%=432회"])}</td>
<td ${td}>기관 사업 및 이용 규정에 대한 이해도 향상</td>
</tr>
<tr>
<td ${td}>${out("정보제공상담 (80명 / 80회)", ["월 80명×1개월=80명 / 80회"])}</td>
<td ${td}>전문지식 제공으로 노년기 문제 해결 능력 강화</td>
</tr>
</tbody></table><p><br></p>`
}

/** Ⅲ장 + 1. 목적·목표 + 실인원수 예시 묶음 */
export function formalPlanChapterBundleHtml(): string {
  return `${formalPlainSectionHtml("실인원수", 4)}${formalStaffCountTableHtml()}${formalChapterHtml("사업 목적 및 평가방법", 3)}${formalSectionHtml("사업의 목적 및 목표", 1)}<p class="doc-body text-[10pt]">아래 「목적·목표」 표 블록을 추가하거나, 본문에 「목적·목표 표」 양식을 삽입하세요.</p><p><br></p>`
}

/** 전년도 평가 반영 3열 표 */
export function formalEvaluationTableHtml(): string {
  const tdArea =
    'class="border border-black bg-white p-2 text-center align-middle text-[10px] font-medium"'
  const bullet = (items: string[]) =>
    `<ul class="doc-cell-list">${items.map((t) => `<li>${t}</li>`).join("")}</ul>`

  return `<table class="bp-rt-table bp-formal-table w-full border-collapse border border-black text-[10px] my-3"><colgroup><col style="width:18%"><col style="width:41%"><col style="width:41%"></colgroup><thead><tr>
<th ${th}>영역</th><th ${th}>평가</th><th ${th}>반영사항</th>
</tr></thead><tbody>
<tr>
<td ${tdArea} rowspan="2">신규회원<br>이용상담</td>
<td ${td}>${bullet(["평가 내용을 입력하세요."])}</td>
<td ${td}>${bullet(["반영사항을 입력하세요."])}</td>
</tr>
<tr>
<td ${td}>${bullet(["세부 평가 항목"])}</td>
<td ${td}>${bullet(["세부 반영 항목"])}</td>
</tr>
<tr>
<td ${tdArea}>기타 영역</td>
<td ${td}>${bullet(["평가 내용"])}</td>
<td ${td}>${bullet(["반영 내용"])}</td>
</tr>
</tbody></table><p><br></p>`
}

export function formalEmptyDocumentHtml(): string {
  return `${formalChapterHtml("사업의 배경 및 필요성", 1)}${formalSectionHtml("대상자 욕구 및 문제점", 1)}${formalBodyHtml()}`
}

export type FormalDocumentTemplate = {
  id: string
  label: string
  description?: string
  html: string
}

export const FORMAL_DOCUMENT_TEMPLATES: FormalDocumentTemplate[] = [
  {
    id: "chapter-3",
    label: "대목차 (Ⅲ.)",
    description: "로마숫자 Ⅲ장",
    html: formalChapterHtml("사업 목적 및 평가방법", 3),
  },
  {
    id: "chapter",
    label: "대목차 (Ⅰ.)",
    html: formalChapterHtml("제목을 입력하세요", 1),
  },
  {
    id: "section",
    label: "중목차 (1. 밑줄)",
    html: formalSectionHtml("제목을 입력하세요", 1),
  },
  {
    id: "section-plain",
    label: "번호 소제목 (4.)",
    description: "밑줄 없음 · 실인원수 등",
    html: formalPlainSectionHtml("실인원수", 4),
  },
  {
    id: "staff-table",
    label: "실인원수 표",
    description: "대상구분·산출근거·단위수",
    html: formalStaffCountTableHtml(),
  },
  {
    id: "goals-table",
    label: "목적·목표 표",
    description: "목적 rowspan · 산출/성과",
    html: formalPurposeGoalsTableHtml(),
  },
  {
    id: "plan-bundle",
    label: "Ⅲ장·실인원 묶음",
    description: "4.실인원+Ⅲ장+1.소제목",
    html: formalPlanChapterBundleHtml(),
  },
  {
    id: "bullet",
    label: "● 항목",
    html: formalBulletLeadHtml("항목 제목"),
  },
  {
    id: "body",
    label: "본문 문단",
    html: formalBodyHtml(),
  },
  {
    id: "eval-table",
    label: "전년도 평가 표",
    html: formalEvaluationTableHtml(),
  },
  {
    id: "full-section",
    label: "섹션 세트 (Ⅰ장)",
    html: formalEmptyDocumentHtml(),
  },
]
