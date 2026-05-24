import type { VersionHistoryEntry } from "@/services/kanban.version-history.types"

export const versionHistoryMock: VersionHistoryEntry[] = [
  {
    id: "vh-1",
    user: "김영수",
    userTeam: "복지1팀",
    target: "3월 상담 실적 등록",
    projectName: "상담",
    actionType: "update_title",
    action: "카드 제목을 수정했습니다.",
    date: "2026-05-19T17:30:00",
    canRestore: true,
    changes: [
      {
        label: "제목",
        before: "3월 상담 실적",
        after: "3월 상담 실적 등록",
      },
      {
        label: "칸반",
        before: "실적관리",
        after: "실적관리",
      },
    ],
  },
  {
    id: "vh-2",
    user: "이승현",
    userTeam: "복지3팀",
    target: "2026 사업계획서 수립",
    projectName: "상담",
    actionType: "move_card",
    action: "카드를 다른 칸반으로 이동했습니다.",
    date: "2026-05-19T16:12:00",
    canRestore: true,
    changes: [
      {
        label: "칸반",
        before: "실적관리",
        after: "사업계획",
      },
      {
        label: "순서",
        before: "2번째",
        after: "1번째",
      },
    ],
  },
  {
    id: "vh-3",
    user: "박수현",
    userTeam: "복지2팀",
    target: "이용자 만족도 설문 배포",
    projectName: "상담",
    actionType: "update_description",
    action: "카드 설명을 수정했습니다.",
    date: "2026-05-19T15:40:00",
    canRestore: false,
    changes: [
      {
        label: "설명",
        before: "상반기 설문 초안",
        after: "상반기 프로그램 만족도 조사",
      },
    ],
  },
  {
    id: "vh-4",
    user: "김태민",
    userTeam: "복지1팀",
    target: "어르신 건강교실",
    projectName: "건강증진",
    actionType: "update_assignee",
    action: "담당자를 변경했습니다.",
    date: "2026-05-18T14:20:00",
    canRestore: true,
    changes: [
      {
        label: "담당자",
        before: "이승현",
        after: "김태민",
      },
    ],
  },
  {
    id: "vh-5",
    user: "관리자",
    userTeam: "운영팀",
    target: "방문요양 A/B 평가",
    projectName: "방문요양",
    actionType: "create_task",
    action: "새 업무 카드를 추가했습니다.",
    date: "2026-05-18T11:05:00",
    canRestore: true,
    changes: [
      {
        label: "제목",
        after: "방문요양 A/B 평가",
      },
      {
        label: "칸반",
        after: "사업평가",
      },
    ],
  },
  {
    id: "vh-6",
    user: "김연수",
    userTeam: "복지2팀",
    target: "임시 테스트 카드",
    projectName: "프로그램",
    actionType: "delete_task",
    action: "업무 카드를 삭제했습니다.",
    date: "2026-05-17T09:50:00",
    canRestore: false,
    changes: [
      {
        label: "제목",
        before: "임시 테스트 카드",
      },
      {
        label: "칸반",
        before: "실적관리",
      },
    ],
  },
  {
    id: "vh-7",
    user: "김영수",
    userTeam: "복지1팀",
    target: "상담",
    projectName: "상담",
    actionType: "update_project",
    action: "프로젝트 정보를 수정했습니다.",
    date: "2026-05-16T18:00:00",
    canRestore: true,
    changes: [
      {
        label: "프로젝트명",
        before: "상담 사업",
        after: "상담",
      },
    ],
  },
  {
    id: "vh-8",
    user: "관리자",
    userTeam: "운영팀",
    target: "건강증진",
    projectName: "건강증진",
    actionType: "create_project",
    action: "신규 사업을 등록했습니다.",
    date: "2026-05-15T10:00:00",
    canRestore: false,
    changes: [
      {
        label: "사업명",
        after: "건강증진",
      },
      {
        label: "연도",
        after: "2026",
      },
    ],
  },
]
