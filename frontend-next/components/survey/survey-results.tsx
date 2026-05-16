"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const chartData = [
  { name: "분위기", 매우불만족: 0, 불만족: 0, 보통: 1, 만족: 1, 매우만족: 2 },
  { name: "소음", 매우불만족: 0, 불만족: 0, 보통: 0, 만족: 1, 매우만족: 1 },
  { name: "청결", 매우불만족: 0, 불만족: 0, 보통: 1, 만족: 1, 매우만족: 2 },
  { name: "쾌적", 매우불만족: 0, 불만족: 0, 보통: 0, 만족: 1, 매우만족: 1 },
  { name: "출입", 매우불만족: 0, 불만족: 0, 보통: 1, 만족: 1, 매우만족: 0 },
]

const pieData = [
  { name: "3,000원 미만", value: 0, color: "#94a3b8" },
  { name: "5,000원", value: 2, color: "#f97316" },
  { name: "7,000원", value: 0, color: "#eab308" },
  { name: "9,900원", value: 0, color: "#22c55e" },
  { name: "12,000원 이상", value: 1, color: "#3b82f6" },
  { name: "기타", value: 1, color: "#8b5cf6" },
]

const textResponses = [
  {
    id: 1,
    text: "공간이 쾌적하고 이용 안내가 잘 되어 있어 좋았습니다.",
    votes: 1,
  },
  {
    id: 2,
    text: "안내문이 조금 더 잘 보이는 곳에 있으면 좋겠습니다.",
    votes: 1,
  },
]

export function SurveyResults() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 text-base font-medium text-foreground">표형</h3>
        <p className="mb-4 text-sm text-muted-foreground">1. 공간 내용 평가</p>
        <p className="mb-4 text-xs text-muted-foreground">답변 4 · 미답변 0</p>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={60} />
              <Tooltip />
              <Legend />
              <Bar dataKey="매우불만족" stackId="a" fill="#ef4444" />
              <Bar dataKey="불만족" stackId="a" fill="#f97316" />
              <Bar dataKey="보통" stackId="a" fill="#eab308" />
              <Bar dataKey="만족" stackId="a" fill="#22c55e" />
              <Bar dataKey="매우만족" stackId="a" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 text-base font-medium text-foreground">
          주관식 서술형
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          5. 개선되어야 할 부분
        </p>
        <p className="mb-4 text-xs text-muted-foreground">답변 4 · 미답변 0</p>

        <div className="space-y-3">
          {textResponses.map((response) => (
            <div
              key={response.id}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <p className="text-sm text-foreground">{response.text}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                답변 {response.votes}표
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 text-base font-medium text-foreground">객관식</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          6. 해당 공간을 실제로 구매하신다면 납득할만한 최대 가격은?
        </p>

        <div className="mt-4 flex items-center gap-8">
          <div className="h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-3 text-sm">
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-foreground">{item.name}</span>
                <span className="text-muted-foreground">
                  {item.value} ({Math.round((item.value / 4) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}