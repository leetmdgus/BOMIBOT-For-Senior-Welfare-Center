const STOP_WORDS = new Set([
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "의",
  "와",
  "과",
  "로",
  "으로",
  "에서",
  "도",
  "만",
  "해",
  "해줘",
  "알려",
  "알려줘",
  "보여",
  "보여줘",
  "요약",
  "전체",
  "몇",
  "무엇",
  "뭐",
  "어떻게",
  "the",
  "a",
  "an",
  "is",
  "are",
])

export function tokenizeForSearch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}
