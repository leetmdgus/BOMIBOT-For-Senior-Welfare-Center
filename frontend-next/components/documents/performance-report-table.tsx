import { cn } from "@/lib/utils"

export function PerformanceReportTable() {
  const data = [
    {
      category: "상담",
      project: "일반상담 및 정보제공사업",
      sub: "신규회원 이용상담",
      detail: "",
      plan1: 80,
      actual1: 127,
      planC1: 80,
      actualC1: 127,
      planB1: 0,
      actualB1: 0,
    },
    {
      category: "",
      project: "",
      sub: "신규회원 가입",
      detail: "",
      plan1: 80,
      actual1: 127,
      planC1: 80,
      actualC1: 127,
      planB1: 0,
      actualB1: 0,
    },
    {
      category: "",
      project: "",
      sub: "신규회원 교육",
      detail: "",
      plan1: 80,
      actual1: 116,
      planC1: 80,
      actualC1: 116,
      planB1: 0,
      actualB1: 0,
    },
    {
      category: "",
      project: "사업 소계 > 일반상담 및 정보제공사업 소계",
      sub: "",
      detail: "",
      plan1: 240,
      actual1: 370,
      planC1: 240,
      actualC1: 370,
      planB1: 0,
      actualB1: 0,
      isSubtotal: true,
    },
  ]

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h3 className="font-medium">조회 결과</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">대분류</th>
              <th className="px-3 py-2 text-left font-medium">사업명</th>
              <th className="px-3 py-2 text-left font-medium">세부사업명</th>
              <th className="px-3 py-2 text-left font-medium">상세분류</th>
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">
                1월 계획인원
              </th>
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">
                1월 실적인원
              </th>
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">
                1월 계획횟수
              </th>
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">
                1월 실적횟수
              </th>
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">
                1월 계획예산
              </th>
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">
                1월 실적예산
              </th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className={cn(
                  "border-b border-border",
                  row.isSubtotal && "bg-amber-50 font-medium"
                )}
              >
                <td className="px-3 py-2">{row.category}</td>
                <td className="px-3 py-2 text-primary">{row.project}</td>
                <td className="px-3 py-2">{row.sub}</td>
                <td className="px-3 py-2">{row.detail}</td>
                <td className="px-3 py-2 text-center">{row.plan1}</td>
                <td className="px-3 py-2 text-center">{row.actual1}</td>
                <td className="px-3 py-2 text-center">{row.planC1}</td>
                <td className="px-3 py-2 text-center">{row.actualC1}</td>
                <td className="px-3 py-2 text-center">{row.planB1}</td>
                <td className="px-3 py-2 text-center">{row.actualB1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}