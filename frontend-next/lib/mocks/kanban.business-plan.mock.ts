import type { BusinessPlanDocument } from "@/services/kanban.task-detail.types"

export const defaultBusinessPlanDocument: BusinessPlanDocument = {
  sections: [
    { id: 1, type: "file", title: "" },
    { id: 2, type: "heading", title: "III. 사업 목적 및 평가방법" },
    { id: 3, type: "table", title: "1. 사업의 목적 및 목표" },
    { id: 4, type: "file", title: "" },
  ],
  formData: {
    projectName: "일반상담 및 정보제공사업",
    purpose:
      "개별 욕구에 적합한 상담으로 정보 및 복지서비스를 제공하여 건강하고 안정적인 노후 생활 지원",
    goals: [
      "초기상담을 통한 욕구 파악으로 이용자 편리성 증진",
      "기관 사업 및 이용 규정에 대한 이해도 향상",
      "전문지식 제공으로 노년기 문제 해결 능력 강화",
    ],
    period: "2026-01-01 ~ 2026-12-31",
    target: "춘천시 거주 만 60세 이상 어르신 중 복지관 이용 희망자 및 이용자",
    totalCount: "2,960명 / 2,965회",
    budget: "금 15,000,000원 (천오백만)",
    budgetCategory: "사업비-사업비-상담사업비",
    manager: "복지1팀 김연수 사회복지사",
    subProjects: [
      {
        name: "신규회원 이용상담",
        output:
          "신규회원 이용상담 (960명 / 960회)\n- 상반기 80명×6개월=480명 / 480회\n- 하반기 80명×6개월=480명 / 480회",
        outcome: "초기상담을 통한 이용자 편리성 증진",
      },
      {
        name: "신규회원 가입",
        output:
          "신규회원 가입 (960명 / 960회)\n- 상반기 80명×6개월=480명 / 480회\n- 하반기 80명×6개월=480명 / 480회",
        outcome: "",
      },
      {
        name: "신규회원 교육",
        output:
          "신규회원 교육 (960명 / 960회)\n- 상반기 80명×6개월×90%=480명 / 480회\n- 하반기 80명×6개월×90%=480명 / 480회",
        outcome: "기관 사업 및 이용 규정에 대한 이해도 향상",
      },
      {
        name: "정보제공상담",
        output: "정보제공상담 (80명 / 80회)",
        outcome: "전문지식 제공으로 노년기 문제 해결 능력 강화",
      },
    ],
  },
}
