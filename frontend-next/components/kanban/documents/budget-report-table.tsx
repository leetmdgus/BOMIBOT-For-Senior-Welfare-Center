import { cn } from "@/lib/utils"

export function BudgetReportTable() {
  const data = [
    {
      gwan: "",
      hang: "",
      mok: "합계",
      budget2026: 6867906003,
      budget2025: 0,
      income: 700310188,
      subsidy: 5901551500,
      sponsor: 260784315,
      transfer: 4600000,
      misc: 660000,
      amount: 6867906003,
      ratio: "100%",
    },
    {
      gwan: "사업비",
      hang: "사업비",
      mok: "일반상담 및 정보제공사업",
      budget2026: 15000000,
      budget2025: 0,
      income: 15000000,
      subsidy: 0,
      sponsor: 0,
      transfer: 0,
      misc: 0,
      amount: 15000000,
      ratio: "100%",
    },
  ]

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h3 className="font-medium">2026년 예산서</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th colSpan={3} className="border-r border-border px-3 py-2 text-center font-medium">
                예산과목
              </th>
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">
                2026년 예산
              </th>
              <th className="px-3 py-2 text-center font-medium">2025년 예산</th>
              <th colSpan={5} className="border-l border-border bg-blue-50 px-3 py-2 text-center font-medium">
                재원구분
              </th>
              <th colSpan={2} className="border-l border-border px-3 py-2 text-center font-medium">
                증감
              </th>
            </tr>

            <tr className="border-b border-border bg-muted/30">
              <th className="w-20 px-3 py-2 text-center font-medium">관</th>
              <th className="w-20 px-3 py-2 text-center font-medium">항</th>
              <th className="border-r border-border px-3 py-2 text-center font-medium">
                목
              </th>
              <th className="bg-blue-50 px-3 py-2" />
              <th className="px-3 py-2" />
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">사업수입</th>
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">보조금</th>
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">후원금</th>
              <th className="bg-blue-50 px-3 py-2 text-center font-medium">법인전입금</th>
              <th className="border-r border-border bg-blue-50 px-3 py-2 text-center font-medium">
                잡수입
              </th>
              <th className="px-3 py-2 text-center font-medium">금액</th>
              <th className="px-3 py-2 text-center font-medium">대비</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className={cn("border-b border-border")}>
                <td className="px-3 py-2 text-center">{row.gwan}</td>
                <td className="px-3 py-2 text-center">{row.hang}</td>
                <td className="border-r border-border px-3 py-2">{row.mok}</td>
                <td className="px-3 py-2 text-right">
                  {row.budget2026.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">{row.budget2025}</td>
                <td className="px-3 py-2 text-right text-primary">
                  {row.income.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right text-primary">
                  {row.subsidy.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">{row.sponsor.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{row.transfer.toLocaleString()}</td>
                <td className="border-r border-border px-3 py-2 text-right">
                  {row.misc.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right text-primary">
                  {row.amount.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-center">{row.ratio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}