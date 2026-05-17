import { cn } from "@/lib/utils"

export function BusinessPlanContent() {
  const stats = [
    { label: "총 사업 수", value: "30", color: "text-primary" },
    { label: "총 연인원", value: "808,039", unit: "명", color: "text-amber-500" },
    { label: "총 연횟수", value: "199,908", unit: "회", color: "text-muted-foreground" },
    { label: "총 예산", value: "6,867,246,003", unit: "원", color: "text-primary" },
  ]

  const projects = [
    {
      category: "1",
      subCategory: "일반상담 및 정보제공사업",
      items: [
        {
          name: "신규회원 이용상담",
          people: 960,
          count: 960,
          budget: 0,
          purpose: "초기상담을 통한 욕구별 서비스 안내",
          target: "복지관 신규등록 회원",
          period: "2026년 1월 1일 ~ 2026년 12월 31일",
          method: "초기상담 및 복지관 이용 관련 상담",
          evaluation: "내부기안, 이용자 명부, 상담일지",
        },
        {
          name: "신규회원 가입",
          people: 960,
          count: 965,
          budget: 15000000,
          purpose: "신규회원가입을 통한 원활한 복지관 이용 지원",
          target: "복지관 신규등록 회원",
          period: "2026년 1월 1일 ~ 2026년 12월 31일",
          method: "신규회원 가입, 카드 발급",
          evaluation: "내부기안, 신규회원 교육대장, 교육자료, 교육명단",
        },
      ],
    },
  ]

  return (
    <div>
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <h3 className="mb-4 font-medium">연도별 통계</h3>

        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <p className={cn("text-3xl font-bold", stat.color)}>
                {stat.value}
                {stat.unit && <span className="text-lg">{stat.unit}</span>}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-primary text-primary-foreground">
                <th className="w-16 px-3 py-2 text-center font-medium">대분류</th>
                <th className="w-16 px-3 py-2 text-center font-medium">하위분류</th>
                <th className="w-24 px-3 py-2 text-center font-medium">세부사업명</th>
                <th className="w-20 px-3 py-2 text-center font-medium">명</th>
                <th className="w-20 px-3 py-2 text-center font-medium">회</th>
                <th className="w-28 px-3 py-2 text-center font-medium">예산</th>
                <th className="px-3 py-2 text-left font-medium">사업내용</th>
              </tr>
            </thead>

            <tbody>
              {projects.map((project, pIdx) => (
                <>
                  <tr key={`subtotal-${pIdx}`} className="border-b border-border bg-muted/30">
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 font-medium">소계</td>
                    <td className="px-3 py-2 text-center font-medium">1,920</td>
                    <td className="px-3 py-2 text-center font-medium">1,925</td>
                    <td className="px-3 py-2 text-right font-medium">15,000,000</td>
                    <td className="px-3 py-2">사업수입 15,000,000</td>
                  </tr>

                  {project.items.map((item, iIdx) => (
                    <tr key={`${pIdx}-${iIdx}`} className="border-b border-border">
                      {iIdx === 0 && (
                        <>
                          <td
                            className="border-l-4 border-l-primary px-3 py-2 text-center align-top"
                            rowSpan={project.items.length}
                          >
                            {project.category}
                          </td>
                          <td className="px-3 py-2 align-top" rowSpan={project.items.length}>
                            {project.subCategory}
                          </td>
                        </>
                      )}

                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-center">{item.people.toLocaleString()}</td>
                      <td className="px-3 py-2 text-center">{item.count.toLocaleString()}</td>

                      <td className="px-3 py-2 text-right">
                        {item.budget > 0 && (
                          <div>
                            <div>사업수익 {item.budget.toLocaleString()}</div>
                            <div>계 {item.budget.toLocaleString()}</div>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="text-muted-foreground">목적 </span>
                            <span className="text-primary">{item.purpose}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">대상 </span>
                            {item.target}
                          </div>
                          <div>
                            <span className="text-muted-foreground">기간 </span>
                            <span className="text-primary">{item.period}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">운영방법 </span>
                            <span className="text-primary">{item.method}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">평가방법 </span>
                            <span className="text-primary">{item.evaluation}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}