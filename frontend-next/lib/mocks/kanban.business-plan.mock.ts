import { serializeTableSectionContent } from "@/lib/business-plan-table-utils"
import {
  formalBodyHtml,
  formalPlainSectionHtml,
  formalSectionHtml,
  formalStaffCountTableHtml,
} from "@/lib/formal-document-html"
import type {
  BusinessPlanDocument,
  BusinessPlanFormData,
} from "@/services/kanban.task-detail.types"

const backgroundBodyHtml = `${formalSectionHtml("대상자 욕구 및 문제점", 1)}${formalBodyHtml(
  "통계청의 고령자 통계에 따르면 고령화 대응의 필요성이 더욱 증가할 것으로 예상된다. 지역 내 어르신의 정보 접근성과 복지서비스 연계에 대한 상담 수요가 지속적으로 증가하고 있다.",
)}${formalSectionHtml("사업 추진 필요성", 2)}${formalBodyHtml(
  "초기상담을 통해 이용자 욕구를 파악하고 적합한 서비스를 안내함으로써 이용 편의성을 높이고, 기관 사업 이해도를 제고할 필요가 있다.",
)}`

const serviceTargetBodyHtml = `${formalSectionHtml("서비스 지역", 1)}${formalBodyHtml(
  "춘천시 관내 (복지관이 위치한 관할 지역)",
)}${formalSectionHtml("서비스 대상", 2)}${formalBodyHtml(
  "춘천시 거주 만 60세 이상 어르신 중 복지관 이용 희망자 및 이용자",
)}${formalPlainSectionHtml("실인원수", 4)}${formalStaffCountTableHtml()}`

const businessContentBodyHtml = `${formalSectionHtml("사업 추진 개요", 1)}${formalBodyHtml(
  "세부사업별 추진 일정·담당·횟수는 아래 사업내용 표에 기재합니다.",
)}${formalSectionHtml("세부 사업", 2)}${formalBodyHtml(
  "신규회원 이용상담, 신규회원 가입, 신규회원 교육, 정보제공상담 프로그램을 연중 운영합니다.",
)}`

export const defaultBusinessPlanFormData: BusinessPlanFormData = {
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
  // 세부사업명 기본값 없음 — 사용자가 직접 추가
  subProjects: [],
}

export const defaultBusinessPlanDocument: BusinessPlanDocument = {
  isCompleted: false,
  sections: [
    {
      id: 1,
      type: "heading",
      title: "I. 사업의 배경 및 필요성",
    },
    {
      id: 2,
      type: "body",
      title: "",
      content: backgroundBodyHtml,
    },
    {
      id: 3,
      type: "heading",
      title: "II. 서비스 지역, 서비스 대상 및 실인원수",
    },
    {
      id: 4,
      type: "body",
      title: "",
      content: serviceTargetBodyHtml,
    },
    {
      id: 5,
      type: "heading",
      title: "III. 사업 목적 및 평가방법",
    },
    {
      id: 6,
      type: "table",
      title: "1. 사업의 목적 및 목표",
      content: serializeTableSectionContent({ preset: "purpose-goals" }),
    },
    {
      id: 7,
      type: "heading",
      title: "IV. 사업내용",
    },
    {
      id: 8,
      type: "body",
      title: "",
      content: businessContentBodyHtml,
    },
    { id: 9, type: "file", title: "" },
  ],
  formData: defaultBusinessPlanFormData,
}

export const businessPlanAiDraftBody = `1. 대상자 욕구 및 문제점
고령 인구 증가에 따라 정보·복지서비스 상담 수요가 확대되고 있으며, 초기 상담을 통한 맞춤형 안내가 필요합니다.

2. 사업 추진 필요성
이용자 편의성 제고와 기관 사업 이해도 향상을 위해 체계적인 상담·정보제공 체계를 마련합니다.`
