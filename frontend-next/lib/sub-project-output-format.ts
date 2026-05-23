/** 세부사업 산출목표 셀 — 제목(굵게) + `-` 목록 표시용 */

export function splitSubProjectOutput(name: string, output: string) {
  const lines = output.split("\n").map((l) => l.trim()).filter(Boolean)
  const title =
    name.trim() ||
    lines[0]?.replace(/^-\s*/, "") ||
    "세부사업명"
  const summary = lines.find(
    (l) => !l.startsWith("-") && l !== title && !l.startsWith(title),
  )
  const bullets = lines
    .filter((l) => l.startsWith("-"))
    .map((l) => l.replace(/^\s*-\s*/, ""))
  const headline =
    lines[0] && !lines[0].startsWith("-") ? lines[0] : summary ?? ""
  return { title, headline, bullets }
}

export function buildSubProjectOutput(
  name: string,
  headline: string,
  bullets: string[],
): string {
  const parts: string[] = []
  const head = headline.trim() || name.trim()
  if (head) parts.push(head)
  for (const b of bullets) {
    const t = b.trim()
    if (t) parts.push(`- ${t}`)
  }
  return parts.join("\n")
}

/** 성과목표 열 rowspan — 연속 동일 값 병합 */
export function computeOutcomeRowSpans(
  subProjects: { outcome: string }[],
): number[] {
  const spans = subProjects.map(() => 1)
  let i = 0
  while (i < subProjects.length) {
    const text = subProjects[i]?.outcome?.trim() ?? ""
    if (!text) {
      spans[i] = 1
      i += 1
      continue
    }
    let j = i + 1
    while (
      j < subProjects.length &&
      (subProjects[j]?.outcome?.trim() ?? "") === text
    ) {
      j += 1
    }
    const span = j - i
    spans[i] = span
    for (let k = i + 1; k < j; k += 1) spans[k] = 0
    i = j
  }
  return spans
}
