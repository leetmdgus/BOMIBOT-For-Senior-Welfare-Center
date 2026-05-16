import { FileText } from "lucide-react"

import { Textarea } from "@/components/ui/textarea"

export function SurveyPreview() {
  const matrixRows = [
    "분위기",
    "소음",
    "청결",
    "쾌적",
    "출입 시의",
    "스터디 환경",
    "스피커",
  ]

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex h-32 items-center justify-center bg-gradient-to-r from-blue-400 to-blue-500">
          <FileText className="size-12 text-white" />
        </div>

        <div className="p-6">
          <h2 className="mb-2 text-lg font-bold text-foreground">
            매우 주관적으로 설문 부탁드립니다.
          </h2>

          <p className="mb-4 text-sm text-muted-foreground">
            본 공간은 스터디와 영화를 동시에 즐길 수 있는 서비스 공간입니다.
            스튜디오 공간과 서비스를 모두 활용한다는 전제로 평가 부탁드립니다.
          </p>

          <p className="text-xs text-muted-foreground">
            2025.07.27. 오후 05:36 ~ 제한 없음
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <h3 className="mb-2 text-base font-medium text-foreground">
          <span className="text-destructive">*</span> 1. 공간 내용 평가
        </h3>

        <p className="mb-4 text-sm text-muted-foreground">
          해당 부분에서 불편함을 느꼈다면 아래 개선 항목에 적어주세요.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-sm text-muted-foreground">
                <th className="pb-3 pr-4 text-left" />
                <th className="px-3 pb-3 text-center">매우 불만족</th>
                <th className="px-3 pb-3 text-center">불만족</th>
                <th className="px-3 pb-3 text-center">보통</th>
                <th className="px-3 pb-3 text-center">만족</th>
                <th className="px-3 pb-3 text-center">매우 만족</th>
              </tr>
            </thead>

            <tbody>
              {matrixRows.map((row) => (
                <tr key={row} className="border-t border-border">
                  <td className="py-3 pr-4 text-sm font-medium text-foreground">
                    {row}
                  </td>

                  {[1, 2, 3, 4, 5].map((col) => (
                    <td key={col} className="px-3 py-3 text-center">
                      <input
                        type="radio"
                        name={row}
                        className="size-4 accent-primary"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-base font-medium text-foreground">
          <span className="text-destructive">*</span> 2. 전반적인 만족도
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">매우 불만족</span>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <label key={num} className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{num}</span>
                <input
                  type="radio"
                  name="satisfaction"
                  className="size-4 accent-primary"
                />
              </label>
            ))}
          </div>

          <span className="text-sm text-muted-foreground">매우 만족</span>
        </div>
      </div>

      <PreviewTextQuestion
        number={3}
        title="이용하면서 긍정적인 부분을 구체적으로 적어주세요."
      />

      <PreviewTextQuestion
        number={4}
        title="이용하면서 개선이 필요한 부분을 구체적으로 적어주세요."
      />
    </div>
  )
}

function PreviewTextQuestion({
  number,
  title,
}: {
  number: number
  title: string
}) {
  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-base font-medium text-foreground">
        <span className="text-destructive">*</span> {number}. {title}
      </h3>

      <Textarea
        placeholder="참여자의 답변 입력란 (최대 2000자)"
        className="min-h-[100px] bg-muted/50"
      />
    </div>
  )
}