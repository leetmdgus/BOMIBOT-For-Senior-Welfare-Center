# 복지관(지역)별 데이터 분리

> **최종 갱신:** 2026-06-08

**동부**(`chuncheon-east`)·**북부**(`chuncheon-north`)는 **서로 다른 데이터**를 사용합니다.

## API (FastAPI)

- 모든 요청에 `X-Region-Id` 또는 JWT `region_id` 필요 (`require_region_id`)
- SQL: `organization`, `dashboard`, `kanban_*` 테이블은 `region_id`로 격리
- JSON 도메인: `region_json_stores (region_id, domain)` — 파일·전자책·설문·실적·문서자동화 등

## 시드 데이터

`backend/seed/data/`:

| 북부 | 동부 |
|------|------|
| `organization.json` | `chuncheon-east-organization.json` |
| `dashboard.json` | `chuncheon-east-dashboard.json` |
| `kanban_projects.json` | `chuncheon-east-kanban_projects.json` |
| `files.json`, `ebooks.json`, … | `chuncheon-east-*.json` |

시더는 `_load_region_json(region_id, base_name)`으로 region별 파일을 우선 로드합니다.

DB 반영:

```bash
cd backend
python scripts/seed.py --force   # 전체 재시드
# 또는
python scripts/seed.py --missing-json   # JSON 도메인만 보충
python scripts/seed.py --sync-organization   # 조직 직원·관리자 계정만 DB 재반영
```

## 대시보드 실데이터

`GET /api/v1/dashboard`는 시드 UI 카드 위에 아래를 **실시간 반영**합니다.

- 인원 현황 → 조직 직원 수
- 활성 프로젝트 → 해당 연도 칸반 사업 수
- 서비스 이용자 / 달성률 → 실적관리(JSON store) 집계

## 프론트 mock

- 스냅샷: `frontend-next/lib/mocks/seed-data/{regionId}/bundle.json`
- `getRegionStore(regionId)`가 해당 bundle만 반환 (복제·문자열 치환 없음)

mock 데이터를 TS mock에서 다시 뽑을 때:

```bash
cd frontend-next
npm run export:region-seed
```

## 분리되는 화면

| 메뉴 | 저장소 |
|------|--------|
| 조직현황 | SQL `departments` / `employees` |
| 대시보드 | SQL `dashboard_*` |
| 사업관리 | SQL `kanban_*` + JSON `performance`, `task_detail` |
| 문서자동화 | JSON `survey`, `reports` |
| 파일들 | JSON `files` |
| 전자책자 | JSON `ebooks` |

## 테스트 계정

| 복지관 | 이메일 | 비밀번호 |
|--------|--------|----------|
| 북부 | `admin@north.bomi.local` | `bomi-north-2026` |
| 동부 | `admin@east.bomi.local` | `bomi-east-2026` |

로그인 후 각 메뉴에서 인원 수·이메일 도메인(`@north` / `@east`)·파일 목록이 서로 다르게 보이는지 확인합니다.

## 사업·서류 담당자 접근

- 일반 사용자: **업무 `assignee`에 본인 이름이 있는 카드만** 칸반·파일(해당 taskId)에서 조회 (복수 담당자 `이름1, 이름2` 지원). `manager`에만 있고 assignee에 없으면 해당 카드는 **보이지 않음**
- **사업 담당자** (`project.manager`): 업무 추가·사업 설정 등 **관리** 가능 (카드 조회는 assignee 기준과 동일)
- **팀장** (`employees.is_team_leader`): 소속 부서와 사업 `team` 필드가 같은 **팀 전체 사업** 조회 (담당 여부 무관)
- **관리자** (`role_type=admin` 또는 `employees.is_admin`): 복지관 내 전체 사업 조회·수정
- API: `GET /kanban/boards`, `GET /reports`, `GET /files*`, `GET|PATCH /kanban/task-detail/*` 등에 JWT + `get_kanban_access_context` 적용
