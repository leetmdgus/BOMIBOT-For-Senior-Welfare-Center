// Mock Data for 봄이봇 사업관리 시스템

// 직원 데이터
export const employees = [
  { id: "emp1", name: "이승현", role: "사회복지사", department: "운영총괄", position: "운영총괄", email: "test@gmail.com", phone: "010-9804-8978", joinDate: "2026-04-29", lastLogin: "2026-05-11 21:25" },
  { id: "emp2", name: "최기원", role: "관장", department: "운영총괄", position: "관장", email: "choi@example.com", phone: "010-1234-5678", joinDate: "2020-01-15", lastLogin: "2026-05-11 20:00" },
  { id: "emp3", name: "이혜진", role: "부장", department: "운영총괄", position: "부장", email: "lee@example.com", phone: "010-2345-6789", joinDate: "2021-03-01", lastLogin: "2026-05-11 19:30" },
  { id: "emp4", name: "김태민", role: "사회복지사", department: "복지1팀", position: "팀원", email: "kim@example.com", phone: "010-3456-7890", joinDate: "2022-06-15", lastLogin: "2026-05-11 18:45" },
  { id: "emp5", name: "이창환", role: "사회복지사", department: "복지1팀", position: "팀원", email: "lee2@example.com", phone: "010-4567-8901", joinDate: "2023-01-10", lastLogin: "2026-05-11 17:20" },
  { id: "emp6", name: "김영수", role: "사회복지사", department: "복지2팀", position: "팀장", email: "kimys@example.com", phone: "010-5678-9012", joinDate: "2021-08-20", lastLogin: "2026-05-11 16:55" },
  { id: "emp7", name: "박미영", role: "사회복지사", department: "복지3팀", position: "팀원", email: "park@example.com", phone: "010-6789-0123", joinDate: "2024-02-01", lastLogin: "2026-05-11 15:30" },
  { id: "emp8", name: "김연수", role: "사회복지사", department: "복지1팀", position: "팀원", email: "kimys2@example.com", phone: "010-7890-1234", joinDate: "2023-07-15", lastLogin: "2026-05-11 14:00" },
]

// 부서 데이터
export const departments = [
  { id: "dept1", name: "전체 직원", count: 30, parentId: null },
  { id: "dept2", name: "운영총괄", count: 3, parentId: "dept1" },
  { id: "dept3", name: "운영지원팀", count: 6, parentId: "dept1" },
  { id: "dept4", name: "복지1팀", count: 5, parentId: "dept1" },
  { id: "dept5", name: "복지2팀", count: 6, parentId: "dept1" },
  { id: "dept6", name: "복지3팀", count: 8, parentId: "dept1" },
  { id: "dept7", name: "자원개발팀", count: 2, parentId: "dept1" },
]

// 사업 데이터
export const projects = [
  {
    id: "proj1",
    name: "상담",
    subName: "일반상담 및 정보제공사업",
    year: 2026,
    status: "진행중",
    manager: "김영수",
    budget: 15000000,
    tasks: {
      실적관리: [
        { id: "task1", title: "3월 상담 실적 등록", description: "상담 인원 및 횟수 데이터 입력", priority: "MEDIUM", assignee: "김영수", progressCount: "05/12", completedCount: 15, totalCount: 20 },
      ],
      사업계획: [
        { id: "task2", title: "2026 사업계획서 수립", description: "연간 사업 목표 및 예산 수립", priority: "HIGH", assignee: "김영수", progressCount: "06/10", completedCount: 8, totalCount: 12 },
      ],
      만족도조사: [
        { id: "task3", title: "이용자 만족도 설문 배포", description: "상반기 프로그램 만족도 조사", priority: "MEDIUM", assignee: "김영수", progressCount: "05/15", completedCount: 45, totalCount: 100 },
      ],
      사업평가: [
        { id: "task4", title: "상반기 종합 평가서 작성", description: "성과 분석 및 개선 사항 도출", priority: "HIGH", assignee: "김영수", progressCount: "06/30", completedCount: 3, totalCount: 10 },
      ],
    },
  },
  {
    id: "proj2",
    name: "교육",
    subName: "노인 정보화 교육",
    year: 2026,
    status: "진행중",
    manager: "박미영",
    budget: 8000000,
    tasks: {
      실적관리: [
        { id: "task5", title: "스마트폰 교육 실적", description: "4월 스마트폰 활용 교육 실적 등록", priority: "HIGH", assignee: "박미영", progressCount: "05/10", completedCount: 28, totalCount: 30 },
      ],
      사업계획: [
        { id: "task6", title: "하반기 교육 계획", description: "하반기 정보화 교육 커리큘럼 수립", priority: "MEDIUM", assignee: "박미영", progressCount: "06/20", completedCount: 5, totalCount: 15 },
      ],
      만족도조사: [],
      사업평가: [],
    },
  },
]

// 세부사업 데이터
export const subProjects = [
  { id: "sub1", projectId: "proj1", name: "신규회원 이용상담", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 127, actualCount: 127, month: "1월" },
  { id: "sub2", projectId: "proj1", name: "신규회원 가입", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 127, actualCount: 127, month: "1월" },
  { id: "sub3", projectId: "proj1", name: "신규회원 교육", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 116, actualCount: 116, month: "1월" },
  { id: "sub4", projectId: "proj1", name: "정보제공상담", category: "--", planPeople: 0, planCount: 0, planBudget: 0, actualPeople: 0, actualCount: 0, month: "1월" },
  { id: "sub5", projectId: "proj1", name: "신규회원 이용상담", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 93, actualCount: 93, month: "2월" },
  { id: "sub6", projectId: "proj1", name: "신규회원 가입", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 93, actualCount: 93, month: "2월" },
  { id: "sub7", projectId: "proj1", name: "신규회원 교육", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 124, actualCount: 124, month: "2월" },
  { id: "sub8", projectId: "proj1", name: "신규회원 이용상담", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 73, actualCount: 73, month: "3월" },
  { id: "sub9", projectId: "proj1", name: "신규회원 가입", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 73, actualCount: 73, month: "3월" },
  { id: "sub10", projectId: "proj1", name: "신규회원 교육", category: "--", planPeople: 80, planCount: 80, planBudget: 0, actualPeople: 62, actualCount: 62, month: "3월" },
]

// 실적 보고서 데이터
export const performanceReports = [
  {
    id: "report1",
    category: "상담",
    projectName: "일반상담 및 정보제공사업",
    subProjects: [
      { name: "신규회원 이용상담", detail: "", jan: { planPeople: 80, actualPeople: 127, planCount: 80, actualCount: 127, planBudget: 0, actualBudget: 0 }, feb: { planPeople: 80, actualPeople: 93, planCount: 80, actualCount: 93, planBudget: 0, actualBudget: 0 }, mar: { planPeople: 80, actualPeople: 73, planCount: 80, actualCount: 73, planBudget: 0, actualBudget: 0 } },
      { name: "신규회원 가입", detail: "", jan: { planPeople: 80, actualPeople: 127, planCount: 80, actualCount: 127, planBudget: 0, actualBudget: 0 }, feb: { planPeople: 80, actualPeople: 93, planCount: 80, actualCount: 93, planBudget: 0, actualBudget: 0 }, mar: { planPeople: 80, actualPeople: 73, planCount: 80, actualCount: 73, planBudget: 0, actualBudget: 0 } },
      { name: "신규회원 교육", detail: "", jan: { planPeople: 80, actualPeople: 116, planCount: 80, actualCount: 116, planBudget: 0, actualBudget: 0 }, feb: { planPeople: 80, actualPeople: 124, planCount: 80, actualCount: 124, planBudget: 0, actualBudget: 0 }, mar: { planPeople: 80, actualPeople: 62, planCount: 80, actualCount: 62, planBudget: 0, actualBudget: 0 } },
      { name: "정보제공상담", detail: "", jan: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 }, feb: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 }, mar: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 } },
    ],
    subtotal: { planPeople: 240, actualPeople: 370, planCount: 240, actualCount: 370, planBudget: 0, actualBudget: 0 },
  },
  {
    id: "report2",
    category: "상담",
    projectName: "전문상담사업",
    subProjects: [
      { name: "우울감소프로그램", detail: "홍보", jan: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 }, feb: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 }, mar: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 } },
      { name: "우울감소프로그램", detail: "프로그램진행", jan: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 }, feb: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 }, mar: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 } },
      { name: "우울감소프로그램", detail: "설문조사", jan: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 }, feb: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 }, mar: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 } },
      { name: "우울감소프로그램", detail: "사후관리상담", jan: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 }, feb: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 }, mar: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 } },
    ],
    subtotal: { planPeople: 0, actualPeople: 0, planCount: 0, actualCount: 0, planBudget: 0, actualBudget: 0 },
  },
]

// 예산 보고서 데이터
export const budgetReports = [
  { id: "budget1", category: "사업비", subCategory: "사업비", projectName: "일반상담 및 정보제공사업", budget2026: 15000000, budget2025: 0, income: 15000000, subsidy: 0, donation: 0, transfer: 0, misc: 0, total: 15000000, ratio: "100%" },
  { id: "budget2", category: "사업비", subCategory: "사업비", projectName: "", budget2026: 0, budget2025: 0, income: 15000000, subsidy: 0, donation: 0, transfer: 0, misc: 0, total: 15000000, ratio: "", isSubRow: true, label: "■ 일" },
  { id: "budget3", category: "사업비", subCategory: "사업비", projectName: "", budget2026: 0, budget2025: 0, income: 15000000, subsidy: 0, donation: 0, transfer: 0, misc: 0, total: 15000000, ratio: "", isSubRow: true, label: "* 상" },
  { id: "budget4", category: "", subCategory: "", projectName: "", budget2026: 0, budget2025: 0, income: 15000000, subsidy: 0, donation: 0, transfer: 0, misc: 0, total: 15000000, ratio: "" },
  { id: "budget5", category: "사업비", subCategory: "사업비", projectName: "전문상담사업", budget2026: 3738000, budget2025: 0, income: 2880000, subsidy: 858000, donation: 0, transfer: 0, misc: 0, total: 3738000, ratio: "100%" },
  { id: "budget6", category: "", subCategory: "", projectName: "", budget2026: 0, budget2025: 0, income: 2880000, subsidy: 858000, donation: 0, transfer: 0, misc: 0, total: 3738000, ratio: "", isSubRow: true, label: "■ 전" },
  { id: "budget7", category: "", subCategory: "", projectName: "", budget2026: 0, budget2025: 0, income: 1440000, subsidy: 429000, donation: 0, transfer: 0, misc: 0, total: 1869000, ratio: "", isSubRow: true, label: "* 우" },
  { id: "budget8", category: "사업비", subCategory: "사업비", projectName: "이용자관리 및 이용자권리증진사업", budget2026: 3370000, budget2025: 0, income: 3370000, subsidy: 0, donation: 0, transfer: 0, misc: 0, total: 3370000, ratio: "100%" },
]

// 사업계획서 보고서 데이터
export const businessPlanReports = {
  summary: {
    totalProjects: 30,
    totalPeople: 808039,
    totalCount: 199908,
    totalBudget: 6867246003,
  },
  items: [
    {
      id: "plan1",
      mainCategory: "1",
      subCategory: "일반상담 및 정보제공사업",
      details: [
        { name: "신규회원 이용상담", people: 960, count: 960, budget: 0, purpose: "초기상담을 통한 욕구별 서비스 안내", target: "복지관 신규등록 회원", period: "2026년 1월 1일 ~ 2026년 12월 31일", method: "초기상담 및 복지관 이용 관련 상담", evaluation: "내부기안(실적보고서), 이용자 명부, 상담일지" },
        { name: "신규회원 가입", people: 960, count: 965, budget: 15000000, purpose: "신규회원가입을 통한 원활한 복지관 이용 지원", target: "복지관 신규등록 회원", period: "2026년 1월 1일 ~ 2026년 12월 31일", method: "신규회원 가입, 카드 발급", evaluation: "내부기안(실적보고서)" },
        { name: "신규회원 교육", people: 960, count: 960, budget: 0, purpose: "신규회원 교육 통한 원활한 복지관 이용지원", target: "복지관 신규등록 회원", period: "2026년 1월 1일 ~ 2026년 12월 31일", method: "집합(신규회원 대상 오리엔테이션) 혹은 개별(교육자료 제공) 교육 진행", evaluation: "내부기안(실적보고서), 신규회원 교육대장, 교육자료, 교육명단" },
        { name: "정보제공상담", people: 80, count: 80, budget: 0, purpose: "전문적인 상담 제공으로 노년기에 직면하는 다양한 어려움 해소", target: "전문상담을 희망하는 복지관 회원", period: "2026년 1월 1일 ~ 2026년 12월 31일", method: "다양한 욕구에 맞는 외부전문가의 상담 연계로 어려움 감소를 위한 대면 전문상담 실시(법률, 세무, 영양, 주택연금 등)", evaluation: "내부기안(실적보고서), 전문 상담일지, 참여자 명단" },
      ],
      subtotal: { people: 2960, count: 2965, budget: 15000000, content: "사업수입 15,000,000" },
    },
  ],
}

// 만족도조사 데이터
export const surveys = [
  { id: "survey1", title: "2026년 상반기 프로그램 만족도 조사", program: "일반상담 및 정보제공사업", status: "진행중", date: "2026.03.01", endDate: "2026.03.15", responseCount: 156, totalTarget: 200, satisfaction: 4.2 },
  { id: "survey2", title: "2025년 하반기 이용자 만족도 조사", program: "정보화 교육", status: "완료", date: "2025.12.01", endDate: "2025.12.15", responseCount: 189, totalTarget: 200, satisfaction: 4.5 },
  { id: "survey3", title: "신규회원 서비스 만족도", program: "회원관리", status: "대기", date: "", endDate: "2026.04.01", responseCount: 0, totalTarget: 100, satisfaction: 0 },
]

// 전자책자 데이터
export const ebooks = [
  { id: "ebook1", title: "2025년도 운영계획보고서", team: "기획전략팀", tag: "운영보고서", thumbnail: "/placeholder.svg", createdAt: "2025-01-15" },
  { id: "ebook2", title: "동계 복지 프로그램 리플릿", team: "복지3팀", tag: "리플릿", thumbnail: "/placeholder.svg", createdAt: "2025-02-20" },
  { id: "ebook3", title: "춘천북부 소식지 4월호", team: "홍보팀", tag: "소식지", thumbnail: "/placeholder.svg", createdAt: "2025-04-01" },
  { id: "ebook4", title: "사회복지 업무 안내서", team: "운영총괄", tag: "안내서", thumbnail: "/placeholder.svg", createdAt: "2025-03-10" },
]

// 파일 데이터
export const files = [
  { id: "file1", name: "2026년 사업계획서.docx", type: "document", size: "2.4 MB", modifiedAt: "2026-05-10", folder: "사업계획" },
  { id: "file2", name: "예산집행현황.xlsx", type: "spreadsheet", size: "1.8 MB", modifiedAt: "2026-05-09", folder: "예산관리" },
  { id: "file3", name: "프로그램 홍보 이미지.png", type: "image", size: "5.2 MB", modifiedAt: "2026-05-08", folder: "홍보자료" },
  { id: "file4", name: "이용자 만족도 분석.pdf", type: "document", size: "3.1 MB", modifiedAt: "2026-05-07", folder: "평가보고" },
  { id: "file5", name: "신규직원 교육영상.mp4", type: "video", size: "128 MB", modifiedAt: "2026-05-06", folder: "교육자료" },
]

// 일정 데이터
export const schedules = [
  { id: "sch1", title: "근로자의 날", date: "2026-05-01", type: "holiday", color: "bg-red-500" },
  { id: "sch2", title: "어린이날", date: "2026-05-05", type: "holiday", color: "bg-pink-500" },
  { id: "sch3", title: "월간회의", date: "2026-05-10", type: "meeting", color: "bg-blue-500" },
  { id: "sch4", title: "사업평가 마감", date: "2026-05-15", type: "deadline", color: "bg-amber-500" },
]

// 봉사자 데이터
export const volunteers = [
  { id: "vol1", name: "치매예방 캠페인", date: "2026-05-10", time: "14:00", location: "1층 로비" },
  { id: "vol2", name: "경로식당 배식봉사", date: "2026-05-12", time: "11:00", location: "지하1층 식당" },
]

// 대시보드 통계
export const dashboardStats = {
  personnelStatus: { count: 45, change: "+2명", description: "전년 대비 2명 증가 (신규 채용 포함)" },
  activeProjects: { count: 12, description: "2026년도 사업계획 승인 완료 기준" },
  serviceUsers: { count: 8420, description: "최근 3개월 누적 이용자 추이" },
  achievementRates: {
    personnel: 85,
    count: 92,
    budget: 74,
  },
}

// API 응답 타입
export type Employee = typeof employees[number]
export type Department = typeof departments[number]
export type Project = typeof projects[number]
export type Survey = typeof surveys[number]
export type Ebook = typeof ebooks[number]
export type File = typeof files[number]
export type Schedule = typeof schedules[number]
export type Volunteer = typeof volunteers[number]
