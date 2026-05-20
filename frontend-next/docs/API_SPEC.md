# BOMIBOT Frontend API 명세서

> Base URL: `/api`  
> Content-Type: `application/json` (파일·이미지 첨부 CS 티켓은 Base64 `dataUrl` 포함 JSON)  
> 환경 변수 `NEXT_PUBLIC_USE_MOCK_API=true` 일 때 클라이언트는 API 대신 `services/*.mock.service.ts` 를 직접 호출합니다.  
> `false` 일 때는 `services/*.api.service.ts` → `app/api/**` → 동일 `*.mock.service.ts` (백엔드 연동 전까지 서버 목업).

## 데이터 레이어 구조

```
components / pages
    ↓  import
services/*.service.ts          ← NEXT_PUBLIC_USE_MOCK_API 분기 (facade)
    ↓                    ↓
*.mock.service.ts      *.api.service.ts → fetch("/api/...")
    ↓                    ↓
lib/mocks/*.ts         app/api/**/route.ts → *.mock.service.ts
```

| 계층 | 역할 |
|------|------|
| `lib/mocks/*.ts` | 정적 시드·상수·목업 비즈니스 데이터 (단일 출처) |
| `services/*.types.ts` | 요청/응답 TypeScript 타입 |
| `services/*.mock.service.ts` | 인메모리 저장·변환·집계 로직 |
| `services/*.api.service.ts` | REST `fetch` 클라이언트 |
| `services/*.service.ts` | UI가 import 하는 공개 API |
| `app/api/**` | Next.js Route Handler (서버 목업) |

**UI 규칙:** 화면 컴포넌트는 `lib/mocks` 를 직접 import 하지 않고 `services/*.service.ts` 만 사용합니다.

## 목차

1. [공통](#공통)
2. [대시보드](#1-대시보드)
3. [조직/직원](#2-조직직원)
4. [전자책](#3-전자책)
5. [파일](#4-파일)
6. [칸반 보드](#5-칸반-보드)
7. [칸반 업무 상세](#6-칸반-업무-상세)
8. [실적 관리](#7-실적-관리)
9. [사업 문서](#8-사업-문서-보고서)
10. [만족도 조사](#9-만족도-조사-survey)
11. [챗봇 (CS · 데이터 · 온톨로지)](#10-챗봇-cs--데이터-어시스턴트--온톨로지)
12. [업무 레거시](#11-업무task-레거시)
13. [전체 API 엔드포인트 목록](#전체-api-엔드포인트-목록)
14. [Service ↔ API 매핑](#service--api-매핑-요약)
15. [Mock 데이터](#mock-데이터-위치)

## 공통

### 응답 규칙

| HTTP 상태 | 설명 |
|-----------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (필수 파라미터 누락 등) |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |

### 에러 응답 예시

```json
{ "error": "Project not found" }
```

---

## 1. 대시보드

### `GET /api/dashboard`

대시보드 통계·진행률·일정·봉사 일정을 조회합니다.

**Response 200**

```json
{
  "stats": [
    {
      "label": "인원 현황",
      "labelEn": "PERSONNEL STATUS",
      "value": "45",
      "unit": "명",
      "description": "전년 대비 2명 증가",
      "iconName": "Users",
      "color": "bg-primary/10 text-primary",
      "link": "전체 직원 현황 보기",
      "goto": "/organization"
    }
  ],
  "progress": [
    {
      "label": "인원 달성률",
      "value": 85,
      "iconName": "Users",
      "color": "bg-primary",
      "textColor": "text-primary"
    }
  ],
  "calendarEvents": [
    { "day": 1, "title": "근로자의 날", "color": "bg-amber-400" }
  ],
  "volunteerEvents": [
    { "id": "v1", "title": "치매예방 캠페인", "date": "2026.05.10", "type": "정기" }
  ]
}
```

**Service:** `getDashboardOverview()` → `dashboard.service.ts`

---

## 2. 조직/직원

### `GET /api/employees`

부서·직원 목록을 조회합니다. 검색어가 있으면 필터링된 결과를 반환합니다.

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| search | string | N | 이름·이메일·부서 검색 |
| department | string | N | 부서명 필터 |

**Response 200**

```json
{
  "departments": [
    {
      "id": "management",
      "name": "운영총괄",
      "count": 3,
      "employees": [
        {
          "id": "emp1",
          "name": "최기원",
          "role": "관장",
          "position": "관장",
          "department": "운영총괄",
          "email": "choi@welfare.org",
          "phone": "010-1234-5678",
          "joinDate": "2020-03-15",
          "tenure": "6년 2개월",
          "lastLogin": "2026-05-11 09:30"
        }
      ]
    }
  ],
  "employees": []
}
```

**Service:** `getDepartments()`, `searchEmployees()` → `organization.service.ts`

---

## 3. 전자책

### `GET /api/ebooks`

전자책 목록을 조회합니다.

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| category | string | N | 카테고리 (`전체` 제외 시 필터) |
| search | string | N | 제목·팀 검색 |

**Response 200**

```json
{
  "ebooks": [
    {
      "id": "1",
      "title": "2025년도 운영계획보고서",
      "team": "기획전략팀",
      "category": "운영보고서",
      "thumbnail": "https://..."
    }
  ],
  "categories": ["전체", "운영보고서", "리플릿"],
  "total": 1
}
```

### `POST /api/ebooks`

전자책을 생성합니다.

**Request Body:** `Book` 필드 (id 제외)

**Response 201:** 생성된 전자책 객체

### `GET /api/ebooks/category-styles`

카테고리별 스타일 설정.

### `GET /api/ebooks/suggested-questions`

전자책 AI 추천 질문 목록.

**Service:** `getEbooks()`, `getCategories()`, `getCategoryStyles()`, `getSuggestedQuestions()` → `ebooks.service.ts`

---

## 4. 파일

### `GET /api/files`

레거시 파일 목록 API (폴더·타입·검색 필터).

**Query:** `folder`, `type`, `search`

**Response 200**

```json
{
  "files": [
    {
      "id": "file1",
      "name": "2026년 사업계획서.docx",
      "type": "document",
      "size": "2.4 MB",
      "modifiedAt": "2026-05-10",
      "folder": "사업계획"
    }
  ],
  "folders": ["사업계획", "예산관리"],
  "storage": { "used": "9.4", "total": 1000, "unit": "MB" }
}
```

### `GET /api/files/manager`

파일 관리 UI용 트리 데이터.

**Response 200**

```json
{
  "files": [],
  "taskOptions": [{ "id": "task-1", "name": "상담 [1-1 일반상담]" }],
  "recentIds": ["folder-1", "file-1"]
}
```

### `POST /api/files` · `DELETE /api/files?id={id}`

파일 업로드·삭제 (목업: 요청만 수락).

**Service:** `getFileManagerState()`, `getFilesList()` → `files.service.ts`

---

## 5. 칸반 보드

### `GET /api/kanban/boards`

연도별 칸반 프로젝트(보드) 목록.

**Query:** `year` (예: `2026`)

**Response 200:** `KanbanProject[]`

### `POST /api/kanban/boards`

신규 프로젝트 생성.

**Request Body**

```json
{
  "assignees": [{ "id": "1", "name": "김태민", "team": "복지 1팀", "position": "사회복지사" }],
  "description": "",
  "project_image": "/Counseling-removebg-preview.png",
  "project_name": "상담",
  "title": "상담 세부사업"
}
```

**Response 201:** `CreateProjectResponse`

### `PATCH /api/kanban/boards/{projectId}/details`

프로젝트 수정.

**Request Body:** `Partial<KanbanProject>`

### `DELETE /api/kanban/boards/{projectId}`

프로젝트 삭제.

**Response 200:** `{ "success": true }`

### `POST /api/kanban/boards/{projectId}/categories/{categoryId}/tasks`

카테고리에 업무 추가.

**Request Body:** `Omit<Task, "id">`

### `PATCH /api/kanban/boards/{projectId}/categories/{categoryId}/tasks/{taskId}/details`

업무 수정.

### `DELETE /api/kanban/boards/{projectId}/categories/{categoryId}/tasks/{taskId}`

업무 삭제.

### `GET /api/kanban/staff`

담당자(직원) 목록 → `Staff[]`

### `GET /api/kanban/project-image-options`

프로젝트 이미지 옵션 → `ProjectImageOption[]`

### `GET /api/kanban/column-types`

칸반 컬럼 타입 목록.

### `GET /api/kanban/task-path-map`

컬럼 타입별 상세 경로 매핑.

### `GET /api/kanban/categories/column-type`

**Query:** `title` (카테고리 제목)

**Response 200:** `"실적관리" | "사업계획" | "만족도조사" | "사업평가"`

### `GET /api/kanban/version-history`

버전 기록 목록.

**Query**

| 이름 | 타입 | 설명 |
|------|------|------|
| year | string | 연도 필터 |
| actionType | string | `all` 또는 액션 타입 |
| query | string | 검색어 |

**Response 200:** `VersionHistoryItem[]`

### `POST /api/kanban/version-history/{historyId}/restore`

버전 복원.

**Service:** `kanban.board.service.ts`, `kanban.version-history.service.ts`

---

## 6. 칸반 업무 상세

### `GET /api/kanban/task-detail/surveys`

칸반 업무 컨텍스트 만족도 조사 목록 → `Survey[]`

### `GET /api/kanban/task-detail/files`

사업평가 첨부 파일 목록 → `EvaluationFile[]`

### `GET /api/kanban/task-detail/evaluation`

사업평가서 본문 데이터.

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| taskId | string | N | 업무 ID (기본: `default`) |

**Response 200:** `BusinessEvaluationData`

```json
{
  "team": "복지 1팀",
  "manager": "김태민",
  "period": "2026.01.01 ~ 2026.12.31",
  "programName": "일반상담 및 정보제공사업",
  "isCompleted": false,
  "evaluationDate": "2026-05-19",
  "detailRows": [{ "label": "목적", "content": "..." }],
  "sections": [{ "id": "sec-1", "type": "body", "title": "", "content": "..." }]
}
```

### `PATCH /api/kanban/task-detail/evaluation`

사업평가서 임시 저장.

**Request Body:** `SaveBusinessEvaluationPayload` + `taskId?`

| 필드 | 타입 | 설명 |
|------|------|------|
| taskId | string | 업무 ID |
| evaluationDate | string | 평가일 |
| supervision | string | 감독 |
| detailRows | EvaluationDetailRow[] | 상세 행 |
| sections | EvaluationSection[] | 제목/본문 블록 |
| keyFactorAnalysis | string | 핵심요인 분석 |
| goalAppropriacy | string | 목표 적절성 |
| suggestion | string | 건의사항 |

**Response 200:** 갱신된 `BusinessEvaluationData`

### `POST /api/kanban/task-detail/evaluation/complete`

사업평가 완료 처리. 완료 시 칸반 업무를 다음 프로세스 컬럼으로 이동(목업).

**Request Body**

```json
{ "taskId": "task-1" }
```

**Response 200:** 완료된 `BusinessEvaluationData` (`isCompleted: true`)

### `GET /api/kanban/task-detail/business-plan`

업무별 **사업계획서** 탭 본문 (단위사업계획서 편집/조회).

**Query**

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| taskId | string | Y | 업무 ID |

**Response 200:** `BusinessPlanDocument`

```json
{
  "formData": {
    "projectName": "일반상담 및 정보제공사업",
    "purpose": "...",
    "goals": ["..."],
    "period": "2026-01-01 ~ 2026-12-31",
    "target": "...",
    "totalCount": "2,960명 / 2,965회",
    "budget": "금 15,000,000원 (천오백만)",
    "budgetCategory": "사업비-사업비-상담사업비",
    "manager": "복지1팀 김연수 사회복지사",
    "subProjects": [
      { "name": "신규회원 이용상담", "output": "...", "outcome": "..." }
    ]
  },
  "sections": [
    { "id": 1, "type": "file", "title": "" },
    { "id": 2, "type": "heading", "title": "III. 사업 목적 및 평가방법" }
  ]
}
```

### `PATCH /api/kanban/task-detail/business-plan`

사업계획서 저장.

**Request Body:** `SaveBusinessPlanPayload` + `taskId` (필수)

**Response 200:** 갱신된 `BusinessPlanDocument`

**Mock:** `lib/mocks/kanban.business-plan.mock.ts`  
**Service:** `getBusinessPlan()`, `saveBusinessPlan()` → `kanban.task-detail.service.ts`

---

## 7. 실적 관리

실적관리 화면(`/kanban/task/[id]/performance`)은 서브 탭으로 UI 전환합니다.

| 탭 | 데이터 소스 (현재) |
|----|-------------------|
| 계획/실적 입력관리 | `getInputManagementRows()` + `getPerformanceInputMeta()` |
| 사업계획 | 입력관리 행 → `inputRowsToSummaryRows()` 클라이언트 집계 (`variant=plan`) |
| 사업실적 | 동일 (`variant=actual`) |
| 사업결과 | 동일 (`variant=result`, 계획 대비 진행률) |

> **단일 데이터 소스:** `lib/mocks/kanban.performance-input.mock.ts` 의 `inputManagementRows` 가 입력관리·사업계획·사업실적·사업결과 탭에 공통 반영됩니다.  
> `kanban.performance-summary.mock.ts` 는 시드 집계용 보조 데이터입니다.  
> `GET /api/performance/monthly-plan` 은 월별 계획 시트용 별도 목업(`kanban.monthly-plan.mock.ts`)이며, 현재 사업계획 탭 UI는 사용하지 않습니다.

### `GET /api/performance`

실적 행 데이터 및 합계.

**Query**

| 이름 | 타입 | 설명 |
|------|------|------|
| projectId | string | 프로젝트 ID 필터 |
| month | string | 월 필터 (예: `1월`) |
| scope | string | `input-management` 이면 입력관리 탭 전용 |

**Response 200 (일반)**

```json
{
  "data": [
    {
      "id": "sub1",
      "selected": false,
      "subProject": "신규회원 이용상담",
      "detailCategory": "--",
      "month": "1월",
      "planPeople": 80,
      "planCount": 80,
      "planBudget": 0,
      "actualPeople": 127,
      "actualCount": 127,
      "actualExpense": 0,
      "content": "신규회원 이용상담"
    }
  ],
  "totals": {
    "planPeople": 240,
    "planCount": 240,
    "planBudget": 0,
    "actualPeople": 370,
    "actualCount": 370,
    "actualExpense": 0
  },
  "count": 10
}
```

**Response 200 (`scope=input-management`)**

```json
{ "data": [ /* PerformanceRow[] */ ] }
```

### `GET /api/performance?scope=input-meta`

입력관리 UI 메타 (세목 칩·세세목 제안 목록).

**Response 200:** `PerformanceInputMeta`

```json
{
  "subProjectChips": [
    { "id": 1, "label": "온라인홍보", "color": "#8fd3ff" }
  ],
  "detailCategories": ["웹매거진", "SNS게시", "홍보물제작", "행사", "기타"]
}
```

**Service:** `getPerformanceInputMeta()` → `kanban.performance.service.ts`

### `PerformanceRow` (입력관리 행)

| 필드 | 타입 | 설명 |
|------|------|------|
| planFunding | PerformanceFundingEntry[] | 원천별 계획 예산 |
| actualFunding | PerformanceFundingEntry[] | 원천별 실적 지출 |
| planBudget | number | `planFunding` 합계 (동기화) |
| actualExpense | number | `actualFunding` 합계 (동기화) |
| fundingSources | string[] | 사용 중인 원천 코드 (`경` `기` `비` `지` `법` `사` `잡`) |

`PerformanceFundingEntry`: `{ "source": "비", "amount": 50000 }`

### `POST` · `PUT` · `DELETE /api/performance`

실적 레코드 CRUD (목업).

### `GET /api/performance/monthly-plan`

월별 사업계획 시트 데이터 (사업계획 탭).

**Query**

| 이름 | 타입 | 설명 |
|------|------|------|
| version | string | `기본계획` \| `1차추경` \| `2차추경` (기본: `기본계획`) |

**Response 200**

```json
{
  "months": ["1월", "2월", "..."],
  "data": {
    "version": "기본계획",
    "rows": [
      {
        "id": "1",
        "name": "신규회원 이용상담",
        "totalPeople": 960,
        "totalCount": 960,
        "totalBudget": 0,
        "monthly": {
          "1월": { "people": 80, "count": 80, "budget": 0 }
        }
      }
    ]
  }
}
```

**Service:** `getPerformanceRows()`, `getInputManagementRows()`, `getPerformanceInputMeta()`, `getMonthlyPlan()` → `kanban.performance.service.ts`

### 실적 요약 시트 (클라이언트 목업 타입)

`PerformanceSummaryRow` (API 미연동, 참고용)

| 필드 | 설명 |
|------|------|
| subProject | 세부사업명 |
| detailCategory | 상세분류 |
| fundingSources | 원천 코드 배열 (`경` `기` `비` `지` `법` `사` `잡`) |
| plan / actual | `total`, `monthly` 각각 `{ people, count, budget }` |

---

## 8. 사업 문서 (보고서)

화면: `/kanban/documents` — 탭 UI로 **실적보고서 · 예산보고서 · 사업계획서** 전환 (`?tab=performance|budget|business-plan` 딥링크).

### `GET /api/reports`

칸반 사업문서 화면 데이터.

**Query**

| type | 설명 |
|------|------|
| (없음) | 전체 (`performanceRows`, `budgetRows`, `businessPlan`) |
| performance | 실적보고서 테이블 행만 |
| budget | 예산보고서 테이블 행만 |
| business-plan | 사업계획서 통계·프로젝트 |

**Response 200 (전체)**

```json
{
  "performanceRows": [
    {
      "majorCategory": "상담",
      "projectName": "일반상담 및 정보제공사업",
      "subProjectName": "신규회원 이용상담",
      "detailCategory": "홍보",
      "planPeople": 80,
      "actualPeople": 127,
      "planCount": 80,
      "actualCount": 127,
      "planBudget": 0,
      "rowType": "data"
    }
  ],
  "budgetRows": [
    {
      "gwan": "사업비",
      "hang": "사업비",
      "mok": "합계",
      "budgetCurrent": 6867906003,
      "budgetPrevious": 0,
      "income": 700310188,
      "subsidy": 5901551500,
      "sponsor": 260784315,
      "transfer": 4600000,
      "misc": 660000,
      "amount": 6867906003,
      "ratio": "100%",
      "rowType": "total"
    }
  ],
  "businessPlan": {
    "stats": [
      { "label": "총 사업 수", "value": "30", "color": "text-sky-600" }
    ],
    "projects": [
      {
        "category": "1",
        "subCategory": "일반상담 및 정보제공사업",
        "subtotal": { "people": 2960, "count": 2965, "budget": 15000000, "content": "사업수입 15,000,000" },
        "items": [
          {
            "name": "신규회원 이용상담",
            "people": 960,
            "count": 960,
            "budget": 0,
            "purpose": "...",
            "target": "...",
            "period": "2026.01.01 ~ 2026.12.31",
            "method": "...",
            "evaluation": "..."
          }
        ]
      }
    ]
  }
}
```

**Service:** `getKanbanDocuments()`, `getPerformanceReportRows()`, `getBudgetReportRows()`, `getBusinessPlanReport()` → `kanban.documents.service.ts`

---

## 9. 만족도 조사 (Survey)

**화면 라우트**

| 경로 | 설명 |
|------|------|
| `/survey/new?view=edit` | 신규 설문 작성 |
| `/survey/[id]?view=edit` | 설문 편집 (조사 개요·기본 항목·문항) |
| `/survey/[id]?view=preview` | 참여자 미리보기 |
| `/survey/[id]?view=results` | 응답 결과·차트 |
| `/survey/[id]/respond` | 공개 응답 화면 (사이드바 없음) |
| `/kanban/task/[id]/survey` | 칸반 업무 탭 — 설문 목록 |

**UI 테마:** 기본 `themeColor` 는 BOMIBOT Primary (`oklch(0.55 0.2 260)`, `globals.css` `--primary`) 와 동일합니다.

### `GET /api/surveys`

설문 카드 목록.

**Response 200:** `SurveyListItem[]`

```json
[
  {
    "id": "1",
    "title": "공간 이용 만족도 조사",
    "program": "상담 [1-1 일반상담]",
    "date": "2026.03.01",
    "status": "진행중",
    "endDate": "2026-08-10",
    "responseCount": 4,
    "totalTarget": 30,
    "satisfaction": 4.2
  }
]
```

| 필드 | 타입 | 설명 |
|------|------|------|
| status | string | `진행중` \| `완료` \| `예정` \| `임시` |
| satisfaction | number | 평균 만족도 (0이면 미집계) |

### `GET /api/surveys/{id}`

설문 상세 (에디터·미리보기 공통).

**Path:** `id` — `new` 이면 빈 템플릿 반환

**Response 200:** `SurveyDetail`

```json
{
  "id": "1",
  "taskId": "1",
  "overview": {
    "purpose": ["이용자 만족도 파악"],
    "limitations": ["표본 수 제한"],
    "name": "공간 이용 만족도 조사",
    "startDate": "2026-03-01",
    "endDate": "2026-12-31",
    "target": "시설 이용 참여자",
    "method": "온라인 설문",
    "staff": "운영팀",
    "sampleCount": "200",
    "analysisMethod": "기술통계, 5점 척도"
  },
  "basicInfo": {
    "title": "공간 이용 만족도 조사",
    "description": "솔직한 의견을 남겨주세요.",
    "category": "만족도조사",
    "status": "active"
  },
  "questions": [
    {
      "id": "q-matrix-1",
      "type": "matrix",
      "title": "공간 내용 평가",
      "description": "",
      "required": true,
      "options": [],
      "rows": ["분위기", "청결"],
      "columns": ["매우 불만족", "불만족", "보통", "만족", "매우 만족"]
    }
  ],
  "style": {
    "themeColor": "oklch(0.55 0.2 260)",
    "coverTitle": "표지 제목",
    "coverDescription": "표지 설명",
    "coverPeriodLabel": "2026.03.01 ~ 2026.03.31",
    "thankYouMessage": "설문에 참여해 주셔서 감사합니다."
  },
  "settings": {
    "acceptResponses": true,
    "allowDuplicate": false,
    "showProgress": true
  }
}
```

**문항 유형 (`SurveyQuestionType`)**

| type | 설명 | 추가 필드 |
|------|------|-----------|
| `text` | 주관식 | — |
| `choice` | 객관식 | `options[]`, `multiple?` |
| `matrix` | 표형 | `rows[]`, `columns[]` |
| `scale` | 1~10 척도 | — |

**basicInfo.status:** `draft` \| `active` \| `closed`

### `POST /api/surveys/{id}`

설문 저장 (임시저장 / 게시).

**Request Body:** `SaveSurveyPayload`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| saveType | string | Y | `draft` \| `publish` (`publish` 시 status → `active`) |
| overview | SurveyOverview | Y | 조사 개요 |
| basicInfo | SurveyBasicInfo | Y | 제목·설명·상태 |
| questions | SurveyQuestion[] | Y | 문항 배열 |
| style | Partial\<SurveyStyle\> | N | 테마·표지 |
| settings | Partial\<SurveySettings\> | N | 응답 설정 |

**Response 200:** `SaveSurveyResult`

```json
{
  "id": "survey-1716123456789",
  "savedAt": "2026-05-19T12:00:00.000Z",
  "status": "active"
}
```

> `id` 가 `new` 인 경우 저장 시 새 ID가 발급됩니다.

### `POST /api/surveys/{id}/responses`

참여자 설문 응답 제출.

**Request Body:** `SubmitSurveyResponsePayload`

```json
{
  "answers": [
    {
      "questionId": "q-scale-1",
      "answer": { "type": "scale", "value": 8 }
    },
    {
      "questionId": "q-text-1",
      "answer": { "type": "text", "value": "만족합니다." }
    },
    {
      "questionId": "q-choice-1",
      "answer": { "type": "choice", "value": "5,000원", "other": "" }
    },
    {
      "questionId": "q-matrix-1",
      "answer": {
        "type": "matrix",
        "value": { "분위기": "만족", "청결": "매우 만족" }
      }
    }
  ]
}
```

**Response 201:** `SubmitSurveyResponseResult`

```json
{
  "responseId": "resp-1716123456789",
  "submittedAt": "2026-05-19T12:00:00.000Z",
  "message": "설문에 참여해 주셔서 감사합니다."
}
```

**Response 400:** 마감·미게시 설문, 빈 answers

**화면:** `/survey/{id}/respond` (사이드바 없는 공개 응답 UI)

### `GET /api/surveys/{id}/results`

설문 결과 집계.

**Response 200:** `SurveyResults`

```json
{
  "surveyId": "1",
  "summary": {
    "totalResponses": 4,
    "totalTarget": 30,
    "averageSatisfaction": 4.2,
    "completionRate": 100
  },
  "questions": [
    {
      "questionId": "q-matrix-1",
      "type": "matrix",
      "title": "1. 공연 내용 평가",
      "subtitle": "공간·프로그램",
      "answeredCount": 4,
      "skippedCount": 0,
      "matrixChart": [
        {
          "name": "상반기",
          "매우불만족": 0,
          "불만족": 0,
          "보통": 1,
          "만족": 2,
          "매우만족": 1
        }
      ]
    },
    {
      "questionId": "q-text-1",
      "type": "text",
      "title": "개선 의견",
      "answeredCount": 4,
      "skippedCount": 0,
      "textResponses": [
        { "id": "t1", "text": "환기 개선 요청", "votes": 1 }
      ]
    },
    {
      "questionId": "q-choice-1",
      "type": "choice",
      "title": "가격 인식",
      "answeredCount": 4,
      "skippedCount": 0,
      "pieData": [
        { "name": "5,000원", "value": 2, "color": "oklch(0.55 0.2 260)" }
      ],
      "otherText": "8000원",
      "otherCount": 1
    }
  ]
}
```

### 칸반 연동 — `GET /api/kanban/task-detail/surveys`

업무 상세 **만족도조사** 탭 카드 목록 (간략 `Survey[]`).

**Service:** `getSurveyList()`, `getSurveyDetail()`, `saveSurvey()`, `submitSurveyResponse()`, `getSurveyResults()` → `survey.service.ts`  
**Mock:** `lib/mocks/survey.mock.ts` (목록·상세·응답·결과, 인메모리 `detailStore` / `responseStore`)

---

## 10. 챗봇 (CS · 데이터 어시스턴트 · RAG)

전역 플로팅 위젯 (`components/chatbot.tsx`). 하단 **데이터 챗봇** / **CS 문의** 두 버튼으로 모드를 고르고, 패널 안에서는 모드를 바꾸지 않습니다(다른 모드는 닫은 뒤 다른 버튼으로 열기).

| 탭 | API | 서버 로직 |
|----|-----|-----------|
| CS | `POST /api/chat/cs-ticket` | `lib/chat/cs-email.ts` (SMTP) |
| 데이터 | `POST /api/chat/assistant` | RAG 검색 + Gemini + 규칙 폴백 |
| (레거시) | `GET /api/chat/ontology` | `lib/chat/ontology/*` (UI 미사용) |

**클라이언트:** `chat.service.ts` → mock 모드에서도 어시스턴트·CS·온톨로지는 위 API를 호출 (서버 전용 처리).

**서버:** `chat.server.service.ts` ← `app/api/chat/*`

### 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `GEMINI_API_KEY` | 데이터 챗봇 LLM | 없으면 RAG+규칙 엔진만 사용 |
| `RAG_API_URL` | N | 외부 RAG API (POST). 없으면 mock 코퍼스 로컬 검색 |
| `RAG_API_KEY` | N | 외부 RAG Bearer 토큰 |
| `RAG_TOP_K` | N | 검색 상위 건수 (기본 8) |
| `SMTP_USER`, `SMTP_PASS` | CS 메일 | Gmail **앱 비밀번호** 권장 |
| `CS_EMAIL_TO` | N | 수신 주소 (기본 `bomi20260413@gmail.com`) |
| `SMTP_SERVICE` | N | 기본 `gmail` |

### `GET /api/chat/config`

챗봇 UI 설정 (CS + 데이터 어시스턴트).

**Response 200:** `ChatAppConfig`

```json
{
  "cs": {
    "welcomeMessage": "안녕하세요, 봄이봇 고객지원입니다...",
    "placeholderReply": "문의가 접수되었습니다...",
    "inputPlaceholder": "이슈 내용을 입력하세요.",
    "csEmail": "bomi20260413@gmail.com",
    "maxAttachments": 5,
    "maxMessageLength": 5000,
    "maxImageSizeMb": 10,
    "maxVideoSizeMb": 100,
    "suggestions": [{ "id": "s1", "text": "...", "icon": "alert" }]
  },
  "assistant": {
    "welcomeMessage": "안녕하세요! 봄이봇 데이터 어시스턴트입니다...",
    "inputPlaceholder": "예: 5월 실적 예산 합계…",
    "thinkingLabel": "데이터를 조회하는 중…",
    "suggestions": [{ "id": "a1", "text": "계획/실적 데이터 전체 요약해줘", "icon": "barChart" }]
  }
}
```

**Service:** `getChatConfig()` → `chat.service.ts`

### `POST /api/chat/assistant`

RAG로 관련 문서 조각을 검색한 뒤, 시스템 데이터·(선택) LLM으로 답변.

**Request Body:** `AssistantQuestionRequest`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| message | string | Y | 사용자 질문 |
| pageUrl | string | N | 질문 시점 URL |

**Response 200:** `AssistantQuestionResponse`

```json
{
  "answer": "5월 계획 예산 합계는 …",
  "sources": ["rag", "performance"],
  "dataAsOf": "2026-05-19T12:00:00.000Z",
  "ragCitations": [
    {
      "id": "performance:month:5월",
      "source": "performance",
      "title": "월별 실적 · 5월",
      "snippet": "5월 계획 예산 …",
      "score": 4
    }
  ]
}
```

**Service:** `askAssistantQuestion()` → `chat.service.ts`

### `GET /api/chat/ontology`

전체 지식 그래프 또는 질문 기반 서브그래프 조회.

**Query:** `q` (선택) — 자연어 질문

**Response 200:** `OntologyGraphApiResponse` (`OntologyGraphPayload` + 선택 `query`)

```json
{
  "graph": { "version": "1.0.0", "generatedAt": "...", "nodes": [], "edges": [], "classHierarchy": {} },
  "stats": { "nodeCount": 120, "edgeCount": 200, "domainCount": 6 },
  "query": {
    "matchedNodeIds": ["domain:performance"],
    "subgraph": { "nodes": [], "edges": [] },
    "reasoningPaths": [],
    "contextText": "..."
  }
}
```

**Service:** `getOntologyGraph(q?)` → `chat.service.ts`

### `POST /api/chat/cs-ticket`

CS 문의 접수 · SMTP 메일 발송.

**Request Body:** `CsTicketRequest`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| message | string | △ | 문의 내용 (`message` 또는 `attachments` 중 하나 이상) |
| attachments | ChatAttachmentPayload[] | N | 이미지·동영상 Base64 |
| pageUrl | string | N | 접수 시점 페이지 URL |
| contactEmail | string | N | 회신 이메일 (`Reply-To`) |

**Response 200:** `CsTicketResponse`

```json
{
  "ticketId": "CS-M9XK2ABC",
  "emailSent": true,
  "sentTo": "bomi20260413@gmail.com",
  "message": "bomi20260413@gmail.com로 접수 메일을 발송했습니다. 티켓 번호: CS-M9XK2ABC"
}
```

`emailSent: false` — SMTP 미설정 시 티켓 ID만 발급, 메일 미발송 안내.

**Response 400 / 500** — 본문 없음 / SMTP 오류

**Service:** `submitCsTicket()` → `chat.service.ts`

---

## 11. 업무(Task) 레거시

### `GET /api/tasks`

칸반 업무 flat 목록.

**Query:** `projectId`, `categoryId`, `year`

**Response 200**

```json
{
  "tasks": [
    {
      "id": "task1",
      "title": "3월 상담 실적 등록",
      "projectId": "proj1",
      "categoryId": "cat1",
      "categoryTitle": "실적관리"
    }
  ]
}
```

### `POST` · `PUT` · `DELETE /api/tasks`

업무 생성·수정·삭제 (목업).

---

## 전체 API 엔드포인트 목록

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/dashboard` | 대시보드 통계 |
| GET | `/api/employees` | 조직·직원 |
| GET | `/api/ebooks` | 전자책 목록 |
| GET | `/api/ebooks/category-styles` | 카테고리 스타일 |
| GET | `/api/ebooks/suggested-questions` | 추천 질문 |
| GET | `/api/files` | 파일 목록 |
| GET | `/api/files/manager` | 파일 관리자 |
| GET | `/api/kanban/boards` | 칸반 프로젝트 목록 |
| POST | `/api/kanban/boards` | 프로젝트 생성 |
| PATCH | `/api/kanban/boards/{projectId}` | 프로젝트 수정 |
| DELETE | `/api/kanban/boards/{projectId}` | 프로젝트 삭제 |
| PATCH | `/api/kanban/boards/{projectId}/details` | 프로젝트 상세 수정 |
| POST | `/api/kanban/boards/.../tasks` | 업무 추가 |
| PATCH | `/api/kanban/boards/.../tasks/{taskId}/details` | 업무 수정 |
| DELETE | `/api/kanban/boards/.../tasks/{taskId}` | 업무 삭제 |
| GET | `/api/kanban/staff` | 담당자 목록 |
| GET | `/api/kanban/project-image-options` | 사업 이미지 5종 |
| GET | `/api/kanban/column-types` | 컬럼 타입 |
| GET | `/api/kanban/categories/column-type` | 카테고리→타입 |
| GET | `/api/kanban/task-path-map` | 상세 경로 맵 |
| GET | `/api/kanban/version-history` | 버전 기록 |
| POST | `/api/kanban/version-history/{historyId}/restore` | 버전 복원 |
| GET | `/api/kanban/task-detail/surveys` | 업무별 설문 목록 |
| GET | `/api/kanban/task-detail/files` | 평가 첨부 파일 |
| GET | `/api/kanban/task-detail/evaluation` | 사업평가 조회 |
| PATCH | `/api/kanban/task-detail/evaluation` | 사업평가 저장 |
| POST | `/api/kanban/task-detail/evaluation/complete` | 사업평가 완료 |
| GET | `/api/kanban/task-detail/business-plan` | 사업계획서 조회 |
| PATCH | `/api/kanban/task-detail/business-plan` | 사업계획서 저장 |
| GET | `/api/performance` | 실적 행·입력관리 (`scope=input-management` \| `input-meta`) |
| POST | `/api/performance` | 실적 생성 |
| PUT | `/api/performance` | 실적 수정 |
| DELETE | `/api/performance` | 실적 삭제 |
| GET | `/api/performance/monthly-plan` | 월별 사업계획 |
| GET | `/api/reports` | 사업문서(실적·예산·계획) |
| GET | `/api/surveys` | 만족도 설문 목록 |
| GET | `/api/surveys/{id}` | 설문 상세 |
| POST | `/api/surveys/{id}` | 설문 저장 |
| POST | `/api/surveys/{id}/responses` | 설문 응답 제출 |
| GET | `/api/surveys/{id}/results` | 설문 결과 |
| GET | `/api/chat/config` | 챗봇 UI 설정 (CS + 어시스턴트) |
| POST | `/api/chat/assistant` | 데이터 어시스턴트 질의 |
| GET | `/api/chat/ontology` | 온톨로지 지식 그래프 (`?q=`) |
| POST | `/api/chat/cs-ticket` | CS 문의 · SMTP 메일 |
| GET | `/api/tasks` | 업무 flat 목록 |
| POST | `/api/tasks` | 업무 생성 |
| PUT | `/api/tasks` | 업무 수정 |
| DELETE | `/api/tasks` | 업무 삭제 |

---

## Service ↔ API 매핑 요약

| 도메인 | Facade Service | Mock Service | API Prefix |
|--------|----------------|--------------|------------|
| 대시보드 | `dashboard.service` | `dashboard.mock.service` | `/api/dashboard` |
| 조직 | `organization.service` | `organization.mock.service` | `/api/employees` |
| 전자책 | `ebooks.service` | `ebooks.mock.service` | `/api/ebooks` |
| 파일 | `files.service` | `files.mock.service` | `/api/files`, `/api/files/manager` |
| 칸반 보드 | `kanban.board.service` | `kanban.board.mock.service` | `/api/kanban/boards`, … |
| 버전 기록 | `kanban.version-history.service` | `kanban.version-history.mock.service` | `/api/kanban/version-history` |
| 업무 상세 | `kanban.task-detail.service` | `kanban.task-detail.mock.service` | `/api/kanban/task-detail/*` |
| 실적 | `kanban.performance.service` | `kanban.performance.mock.service` | `/api/performance`, `/api/performance/monthly-plan` |
| 사업문서 | `kanban.documents.service` | `kanban.documents.mock.service` | `/api/reports` |
| 만족도조사 | `survey.service` | `survey.mock.service` | `/api/surveys` |
| 챗봇 | `chat.service` | `chat.mock.service` (+ `chat.server.service`) | `/api/chat/*` |

---

## Mock 데이터 위치

| 파일 | 용도 | Mock Service |
|------|------|----------------|
| `lib/mocks/dashboard.mock.ts` | 대시보드 | `dashboard.mock.service.ts` |
| `lib/mocks/organization.mock.ts` | 조직·직원 | `organization.mock.service.ts` |
| `lib/mocks/ebooks.mock.ts` | 전자책 | `ebooks.mock.service.ts` |
| `lib/mocks/files.mock.ts` | 파일 목록 API | `files.mock.service.ts` |
| `lib/mocks/files-manager.mock.ts` | 파일 관리 UI | `files.mock.service.ts` |
| `lib/mocks/kanban.board.mock.ts` | 칸반 보드·담당자·경로 | `kanban.board.mock.service.ts` |
| `lib/mocks/kanban.task-detail.mock.ts` | 사업평가·첨부 파일 | `kanban.task-detail.mock.service.ts` |
| `lib/mocks/kanban.business-plan.mock.ts` | 사업계획서 탭 | `kanban.task-detail.mock.service.ts` |
| `lib/mocks/kanban.documents.mock.ts` | 사업문서 보고서 행 | `kanban.documents.mock.service.ts` |
| `lib/mocks/kanban.performance-input.mock.ts` | 실적 입력·집계 단일 소스 | `kanban.performance.mock.service.ts` |
| `lib/mocks/kanban.monthly-plan.mock.ts` | 월별 계획 시트(보조) | `kanban.performance.mock.service.ts` |
| `lib/mocks/kanban.performance-summary.mock.ts` | 요약 시드(입력 mock 보조) | — |
| `lib/mocks/kanban.version-history.mock.ts` | 버전 기록 | `kanban.version-history.mock.service.ts` |
| `lib/mocks/survey.mock.ts` | 만족도 조사 전역 | `survey.mock.service.ts` |
| `lib/mocks/chat.mock.ts` | 챗봇 UI 설정 (CS·어시스턴트) | `chat.mock.service.ts` / `chat.server.service.ts` |
| `lib/chat/ontology/*` | 지식 그래프 빌드·질의 | `chat.server.service.ts` |
| `lib/chat/assistant-*.ts` | 데이터 스냅샷·LLM·규칙 답변 | `chat.server.service.ts` |
| `lib/chat/cs-*.ts` | CS SMTP 발송 | `chat.server.service.ts` |

**삭제·미사용:** 빈 `kanban.survey.*` 서비스 스텁, `kanban.survey.mock.ts` (설문은 `survey.mock.ts` + `getSurveys()` 로 통합).

---

## 클라이언트 사용 예시

```typescript
import { getProjects } from "@/services/kanban.board.service"
import {
  askAssistantQuestion,
  getOntologyGraph,
  submitCsTicket,
} from "@/services/chat.service"

const projects = await getProjects("2026")

const answer = await askAssistantQuestion({
  message: "5월 계획 예산 합계는?",
  pageUrl: window.location.href,
})

const graph = await getOntologyGraph("온라인홍보 실적")

await submitCsTicket({
  message: "실적 화면 오류",
  attachments: [{ name: "capture.png", type: "image/png", dataUrl: "data:image/png;base64,..." }],
  pageUrl: window.location.href,
  contactEmail: "user@example.com",
})
```

`NEXT_PUBLIC_USE_MOCK_API=false` 로 설정하면 동일 함수가 위 표의 API를 `fetch` 합니다.
