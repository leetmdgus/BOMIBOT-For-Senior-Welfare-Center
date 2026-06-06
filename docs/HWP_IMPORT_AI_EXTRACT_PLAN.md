# 한글(HWP) 템플릿 업로드 → 에디터 자동 재구성 → 실적 데이터 자동 채움 기획서

> 작성일: 2026-06-06 (개정: 방향 전환) · 대상: 사업계획 / 사업평가 문서 작성
> ⚠️ 이 문서는 이전 "HWP에서 데이터 추출" 기획을 **폐기하고 대체**합니다. HWP는 데이터 소스가 아니라 **양식(템플릿)** 이며, 데이터는 이미 시스템 내 **실적관리**에 있습니다.

---

## 1. 목표와 결정사항

### 1.1 사용자 시나리오
담당자가 기관 고유의 한글 양식(사업계획서/평가서 서식)을 `.hwp`/`.hwpx`로 업로드하면:
1. 에디터가 **그 양식의 레이아웃(표·칸·항목)을 그대로 재현**하고,
2. **실적관리에 이미 입력된 데이터**(계획/실적 인원·횟수·예산, 세부사업, 재원 등)로 빈칸을 자동으로 채워주며,
3. 한번 올린 양식은 **"이전 양식 불러오기"** 목록에 누적되어 다음에 다시 선택해 쓸 수 있다.

손으로 양식을 다시 그리거나 숫자를 옮겨 적는 작업을 없앤다.

### 1.2 확정된 설계 결정 (사용자 선택)

| 항목 | 결정 | 함의 |
|------|------|------|
| 에디터 동작 | **템플릿 레이아웃을 그대로 렌더링** | 고정 3종 레이아웃 → 임의 템플릿을 충실히 미러링하는 **데이터 기반 동적 렌더러** 필요 (최대 난이도 지점) |
| 채움 매핑 | **AI 자동 매핑 + 검토 후 적용** | AI가 템플릿 칸 라벨 ↔ 실적 데이터를 매칭, 사용자가 diff로 확인 후 적용 |
| 채울 데이터 | **집계값 + 상세표 둘 다** | 단일값 칸 → 집계(총예산 등), 표 영역 → 실적 상세 행 채움 |
| 입력 포맷 | `.hwp` + `.hwpx` | `.hwpx`는 기존 파서, `.hwp`는 rhwp 연동 (이전 결정 유지) |
| AI 모델 | 기존 Gemini 게이트웨이 재사용 | (이전 결정 유지) |

---

## 2. 현재 시스템 분석 (이 기획의 토대)

### 2.1 결정적으로 잘 맞는 기존 자산 — 일반화하면 됨

**① 양식 바인딩 엔진이 이미 있다 (고정 → 동적으로 확장)**
- `backend/app/application/hwpx/hwpx_templates.py` — `HwpxTemplateKind = "empty"|"plan"|"evaluation"` **3종 고정** 레지스트리. section0.xml에서 문단/표 프로토타입, borderFill ID를 추출하는 로직 보유.
- `backend/app/application/hwpx/task_hwpx_sync.py` + `HwpxExportService.build_business_plan_hwpx(form_data, sections)` — **폼 데이터를 템플릿에 치환해 HWPX 생성** → 파일관리 업로드. (저장 시 자동 동기화)
- `HwpxAutomationService.parse_hwpx_bytes()` → `frontendJson`(편집 가능한 문단/표 구조).
- `export_hwpx_preserving(hwpx_bytes, frontend_json)` — **원본 HWPX의 나머지(mimetype·header·BinData·Preview)는 절대 보존하고 section0.xml만 교체**. → 임의 템플릿에 값만 써넣기에 이상적.

> 즉, "양식 → 값 치환 → HWPX 재생성" 파이프라인이 이미 작동한다. 이번 작업은 이걸 **3종 고정에서 임의 업로드 템플릿으로 일반화**하는 것이다.

**② 에디터에 이미 '필드' 추상화가 있다**
- `frontend-next/components/kanban/task-detail/business-plan-editor.tsx`:
  - `A4DocumentViewport` + `HwpxDocument`/`HwpxTable`/`HwpxLabel`/`HwpxValue` 로 **HWPX 같은 표 문서를 렌더링**.
  - `RichTextToolbarProvider` + `registerFieldBlock(id, label)` / `activateFieldBlock(id)` — `plan-project-name`, `plan-purpose`, `plan-sub-{index}` 같은 **필드 블록 등록 시스템**.
  - 단점: 레이아웃이 **하드코딩**(`PLAN_FIELD_BLOCKS` 9개 + 세부사업 표 고정). → **frontendJson을 걸어 동적으로 렌더링**하도록 일반화해야 함.

**③ 실적관리 데이터 (채움 소스)**
- `PerformanceRow` (`services/kanban.task-detail.types.ts`): `subProject, detailCategory, month, planPeople, planCount, planBudget, actualPeople, actualCount, actualExpense, content, fundingSources[], planFunding[], actualFunding[], taskId`.
- 저장: region_json_stores domain `"performance"`. UI: `performance/input-management-*.tsx`.

**④ AI / 파일 인프라**
- LLM: `assistant_llm.py` → Gemini 게이트웨이(`gemini-2.0-flash`, `temperature` 조절). httpx `chat/completions`.
- 파일: `POST /files/upload` (multipart). 파일 저장: `file_storage_service.py` (region별 디스크).
- rhwp: `.hwp`(CFB)+`.hwpx`(zip) 파서. `.hwp` 지원에 필요 (이전 결정).

### 2.2 새로 만드는 것 (공백)

1. **임의 템플릿 등록·보관** — 업로드 양식의 원본 + 파싱된 구조 + 채움 슬롯 메타를 region별 **템플릿 라이브러리**에 저장. ("이전 양식 불러오기"의 소스)
2. **frontendJson → 편집 가능한 충실 렌더러** — 하드코딩 레이아웃을 데이터 기반 동적 컴포넌트로 일반화. **(최대 난이도)**
3. **채움 슬롯 탐지** — 템플릿에서 "값이 들어갈 칸"을 식별.
4. **AI 매핑 레이어** — 슬롯 라벨 ↔ 실적 데이터(집계/상세)를 매칭해 제안.
5. **검토 diff UI + 적용**, **양식 라이브러리 UI**.

---

## 2.5 Phase 0 스파이크 결과 (2026-06-06 검증 완료)

실제 샘플(`rhwp/samples/hwpx/`)로 기존 파이프라인을 돌려 핵심 가설을 실측했다. 스크립트: `backend/scripts/spike_template_roundtrip.py`.

### 검증된 것 ✅

| 항목 | 결과 | 근거 |
|------|------|------|
| **ⓒ-1 채워진 칸 텍스트 교체 왕복** | ✅ PASS | `form-002.hwpx`, 정부 보도자료 양식에서 셀 텍스트 변경 → `export_hwpx_preserving` → 재파싱까지 반영 확인 |
| **★ ⓒ-2 빈 칸 채우기** (최대 의문) | ✅ PASS (3/3 샘플) | 양식의 *빈 셀*에 text_run 주입 → 써넣기 → 재파싱 반영 성공. **빈 양식 칸을 채울 수 있다** |
| **ⓐ 구조 데이터 충분성** | ✅ 충분 | `frontendJson`이 표를 `rows[].cells[]` + `row/col/row_span/col_span/width/backgroundColor/paragraphs`로 완전 구조화 |
| **writeback 엔진 범위** | ✅ 예상보다 넓음 | `section0_writeback.py`가 docstring("Phase 1=문단만")과 달리 **표 셀 텍스트·배경·글자서식까지** 원본 보존하며 처리 (`_apply_cell_text`) |

### 실측 데이터 (양식의 실제 모습)

- `form-002.hwpx`: 표 5개, **표#0 = 26행×27열 / 셀 83개 중 병합 69개, 빈칸 47개**. 라벨↔값 패턴 뚜렷: `'개발형태' | '' | '' | '의약바이오' | ''`
- 정부 보도자료 양식: 문단 103개, 표 25개 (12행×10열 등 대형 표 다수)
- → **실무 양식은 병합이 매우 심하다**. frontendJson에 span 정보는 있으나, 충실 렌더에서 27열 희소 병합 그리드를 그리는 건 실제 작업량이 큼.

### 의미 (리스크 재평가)

- 가장 컸던 두 리스크(**writeback 왕복 + 빈칸 채움**)가 🔴→🟢. 임의 템플릿에 실적값을 써넣는 백엔드 경로는 **기존 코드로 거의 동작**한다.
- 남은 핵심 작업은 **프론트 충실 렌더링**(데이터는 충분, 구현량이 큼)과 **빈칸 정밀 타겟팅**(스파이크는 `run_index=0` 휴리스틱으로 성공 — 견고한 셀↔run 매핑 필요).

### ⓑ rhwp `.hwp` 빌드 — 차단됨 (toolchain 버전)

- `cargo build` 실패: 설치된 **rustc 1.87.0** < 의존성 요구치. `image@0.25.10`, `zip@8.6.0`가 **rustc 1.88+** 요구.
- 해결책(둘 중 하나, Phase 3에서 수행):
  - **(권장)** `rustup update stable` → 1.88+ → 재빌드. (toolchain 다운로드 + 전체 빌드 수 분)
  - 또는 deps 핀: `cargo update image@0.25.10 --precise <1.87호환>` + `zip` 동일.
- `.hwp`는 Phase 3 항목이라 코어 타당성에는 영향 없음. `samples/biz_plan.hwp`로 빌드 후 즉시 검증 가능.

---

## 3. 아키텍처 설계

### 3.1 전체 흐름

```
[A] 양식 업로드                          [B] 이전 양식 불러오기
 .hwp/.hwpx 업로드                        템플릿 라이브러리 목록 → 선택
      │                                        │
      ▼                                        ▼
 ① 포맷 정규화 (.hwp→rhwp, .hwpx→기존 파서) → frontendJson(구조)
 ② 슬롯 탐지: 채울 칸/표영역 식별 (라벨↔값 휴리스틱)
 ③ 템플릿 라이브러리에 저장(원본 bytes + frontendJson + 슬롯메타)  ← [A]만
      │
      ▼
 ④ 에디터가 frontendJson을 그대로 렌더링 (충실 레이아웃)
      │
      ▼
 ⑤ 실적 스냅샷 생성: 집계값 + 상세표 (task의 performance 데이터)
 ⑥ AI 매핑(Gemini): 슬롯 라벨 ↔ 실적 데이터 → 슬롯별 {value, confidence, evidence}
      │
      ▼
 ⑦ diff 검토 패널: 슬롯별 [빈칸]→[AI 제안] 확인/수정/선택
      │  사용자 "적용"
      ▼
 ⑧ 에디터 state 반영 → 저장 시 export_hwpx_preserving 로
    원본 템플릿 HWPX에 값만 써넣어 재생성 → 파일관리
```

**원칙**: ⑥ AI 매핑은 **제안만** 한다(자동 저장 없음). ⑦ 검토 후에만 ⑧ 반영. (결정: 검토 후 적용)

### 3.2 백엔드 모듈 (신규/수정)

**신규: `backend/app/application/hwpx/templates_library/`** — 사용자 템플릿 보관
- `store.py` — region store domain `"document_templates"`에 메타 + 슬롯, 원본 bytes는 `file_storage_service`에. 항목:
  ```jsonc
  { "id", "name", "sourceFilename", "format": "hwp|hwpx",
    "fileId",            // 원본 bytes 파일 참조
    "frontendJson": {…}, // 파싱된 편집 구조
    "slots": [ … ],      // 탐지된 채움 슬롯
    "createdAt", "createdBy" }
  ```
- list / get / delete / create.

**신규: `backend/app/application/hwpx/ingest/`** (이전 결정 유지 — `.hwp` 지원)
- `format_normalizer.py` — `.hwpx`→`parse_hwpx_bytes`, `.hwp`→`rhwp_adapter`로 `.hwpx`/콘텐츠 변환 후 합류.
- `rhwp_adapter.py` — rhwp 릴리즈 바이너리 subprocess 호출(`RHWP_BIN`). Phase 0 스파이크로 변환 경로 확정.

**신규: `backend/app/application/hwpx/template_fill/`** — 채움 핵심
- `slot_detector.py` — frontendJson 표를 순회하며 슬롯 식별. 휴리스틱:
  - 라벨 셀: 짧고 끝이 명사/콜론, 좌측·상단 헤더 위치. 값 셀: 라벨에 인접한 빈/얕은 셀.
  - 표 영역: 헤더 행 + 반복 데이터 행 구조 → "상세표 슬롯"으로 표시.
  - 각 슬롯: `{ slotId, kind: "value"|"tableRegion", label, path(셀 좌표), columns?(표영역) }`
- `performance_snapshot.py` — task의 performance 데이터로
  - **집계**: `totalPlanBudget/totalActualExpense/totalPlanPeople/…`, 세부사업별 롤업, 계획 대비 실적.
  - **상세표**: 세부사업·월 단위 행 배열(컬럼 정의 포함).
- `ai_mapper.py` — Gemini 호출. 입력: (슬롯 목록+라벨 / 실적 집계+상세 스키마). 출력: 슬롯별
  ```jsonc
  { "slotId": "...", "kind": "value",
    "value": "₩12,000,000", "sourceExpr": "sum(planBudget)",
    "confidence": 0.9, "evidence": "라벨 '총 사업비' ↔ 계획예산 합계" }
  // tableRegion: { "rows": [...], "columnMap": {"예산":"planBudget", ...} }
  ```
  - 환각 방지: "데이터에 없으면 null, 추측 금지". `temperature=0`. JSON 출력.
- `llm_client.py` (리팩터링) — `assistant_llm.py` Gemini 호출을 `gemini_chat(settings, messages, json_mode)` 공용 헬퍼로 추출.

**수정**
- 라우터: 신규 `backend/app/interfaces/api/v1/document_templates.py` (또는 task_detail.py 확장)
  ```
  POST   /api/v1/document-templates            (업로드 → 정규화 → 슬롯탐지 → 저장)
  GET    /api/v1/document-templates            (목록 — "이전 양식 불러오기")
  GET    /api/v1/document-templates/{id}       (frontendJson + 슬롯)
  DELETE /api/v1/document-templates/{id}
  POST   /api/v1/document-templates/{id}/fill?taskId=…   (실적 스냅샷 + AI매핑 → 제안 반환)
  POST   /api/v1/document-templates/{id}/export?taskId=… (채운 값 → export_hwpx_preserving)
  ```
- `app/core/config.py` — `RHWP_BIN`.
- `Dockerfile`/`docker-compose.yml` — rhwp 빌드 스테이지(Phase 3).

### 3.3 프론트엔드 (신규/수정)

**신규: `components/kanban/task-detail/template-doc/`**
- `template-document-editor.tsx` — **frontendJson을 걸어 충실 렌더링하는 데이터 기반 에디터**. 기존 `HwpxDocument/HwpxTable/HwpxLabel/HwpxValue`, `A4DocumentViewport`, `LineSlotInput`, 리치텍스트를 재사용하되 레이아웃을 frontendJson(문단·표·셀, rowspan/colspan)에서 동적으로 생성. 슬롯 셀에 입력 위젯 바인딩.
- `template-upload-dialog.tsx` — 드래그&드롭 업로드 → 분석 진행 표시.
- `previous-templates-dialog.tsx` — **"이전 양식 불러오기"**: 라이브러리 목록(이름/날짜/썸네일) → 선택 시 frontendJson 로드 + 현재 task 실적으로 fill 재실행.
- `fill-review-panel.tsx` — 슬롯별 [빈칸]→[AI 제안] diff, 신뢰도/근거, 체크박스 적용, 인라인 수정.

**수정**
- `business-plan-tab.tsx` / `business-evaluation-tab.tsx` — "📄 양식 업로드", "이전 양식 불러오기" 버튼 + 다이얼로그 연결. (또는 신규 "양식 문서" 탭)
- `services/kanban.task-detail.api.service.ts` — `uploadDocumentTemplate`, `listDocumentTemplates`, `getDocumentTemplate`, `fillTemplateFromPerformance`, `exportFilledTemplate`.
- `services/kanban.task-detail.types.ts` — `DocumentTemplate`, `TemplateSlot`, `TemplateFillProposal`, `SlotFill`.

### 3.4 채움 매핑 예시

| 템플릿 칸/영역 (라벨) | 슬롯 종류 | 실적 소스 | 결과 |
|----------------------|-----------|-----------|------|
| "총 사업비" | value | `sum(planBudget)` | ₩12,000,000 |
| "총 참여인원" | value | `sum(planPeople)` | 350명 |
| "집행액" | value | `sum(actualExpense)` | ₩9,800,000 |
| "세부사업별 실적" 표 | tableRegion | 세부사업×월 상세행 | 행별 채움 |
| "사업기간" | value | performance month 범위 | 2026.01~12 |

---

## 4. 리스크 및 대응

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| **임의 HWP 레이아웃을 HTML 에디터로 충실 렌더링** (병합셀·스타일·다단) | 🔴 최고 | **Phase 0 스파이크 필수**. 대안 티어: ⓐ frontendJson 표를 rowspan/colspan 최선 재현(권장 시작점), ⓑ rhwp의 SVG/HTML 렌더를 배경으로 깔고 탐지된 셀 위에 입력 오버레이, ⓒ 복잡 양식은 "단순화 렌더" 경고. 충실도 목표를 단계적으로 설정 |
| 슬롯 탐지 정확도(어느 칸이 채울 칸인지) | 🟠 | 휴리스틱 + AI 보조, 사용자가 검토 패널에서 슬롯 추가/제외 |
| AI 매핑 오배치 | 🟠 | confidence+evidence, **필수 검토**, 빈칸 우선·기존값 덮어쓰기 기본 해제 |
| `.hwp` 변환 품질(특히 표) | 🟠 | Phase 0 rhwp 스파이크 → go/no-go |
| writeback 충실도 | 🟡 | `export_hwpx_preserving`가 원본 보존+section0만 교체 → 셀 텍스트 치환은 안전. 표영역 행 증식은 검증 필요 |
| 실적/계획 혼동 | 🟡 | 슬롯 라벨로 계획(plan*) vs 실적(actual*) 구분, 매핑에 명시 |
| Rust 툴체인 이미지 비대화 | 🟡 | 멀티스테이지 Docker(바이너리만 복사) |

---

## 5. 구현 단계 (제안)

| 단계 | 내용 | 검증/산출물 |
|------|------|-------------|
| **Phase 0 — 스파이크** | ⓐ frontendJson→편집가능 충실 렌더 한계 측정, ⓑ rhwp `.hwp`→`.hwpx`, ⓒ `export_hwpx_preserving`로 임의 템플릿 셀 치환 왕복 | 충실도 보고 + 렌더 전략 확정 |
| **Phase 1 — .hwpx 템플릿 MVP** | `.hwpx` 업로드 → 충실 렌더 → 수동 채움 → 저장/HWPX 내보내기. 템플릿 라이브러리 + "이전 양식 불러오기" | 양식 업로드·재사용 동작 |
| **Phase 2 — 실적 자동 채움 + AI** | performance 스냅샷(집계+상세) + 슬롯 탐지 + AI 매핑 + diff 검토 | 자동 채움 동작 |
| **Phase 3 — .hwp 지원** | rhwp 어댑터 + 멀티스테이지 Docker (Phase 0 반영) | `.hwp` 지원 |
| **Phase 4 — 마감** | 충실도/정확도 튜닝, 표영역 행 채움 고도화, 썸네일, 비용 텔레메트리 | 운영 품질 |

> Phase 1은 AI 없이 ".hwpx 양식 올려 재사용"만으로도 가치 전달. AI 자동 채움(Phase 2)은 그 위에 얹는다. 가장 큰 불확실성(충실 렌더)을 **Phase 0에서 먼저 깬다**.

---

## 5.5 Phase 1 구현 현황 (2026-06-06)

`.hwpx` 템플릿 MVP를 백엔드·프론트 전 구간 구현 + 검증 완료.

### 백엔드 (검증: end-to-end ALL PASS — `backend/scripts/spike_template_service.py`)
- 도메인: `DOMAIN_DOCUMENT_TEMPLATES`(`constants.py`)
- 서비스: `app/application/region_store/document_templates.py` — `DocumentTemplateService`
  (create/list/get/delete/export). 메타만 JSON 저장 + 원본 bytes는 파일스토리지, GET 재파싱.
- 위임: `RegionStoreService` 파사드 메서드 + 컨테이너 배선
- 라우터: `app/interfaces/api/v1/document_templates.py` (router.py 등록)
  - `POST /document-templates`(업로드) · `GET`(목록) · `GET/{id}`(frontendJson) · `DELETE/{id}` · `POST/{id}/export`
- 채움 내보내기는 기존 `export_hwpx_preserving` 재사용(원본 절대 보존).

### 프론트 (검증: tsc --noEmit — 신규 파일 에러 0)
- 타입: `services/document-templates.types.ts` (frontendJson 구조 미러)
- API: `services/document-templates.api.service.ts` (`/api/document-templates` catch-all 프록시 자동)
- 헬퍼: `lib/kanban/template-frontend-json.ts` (HWPUNIT→px, 셀/문단 불변 업데이트, 빈칸 `run_index=0` 주입)
- 렌더러: `components/kanban/task-detail/template-doc/template-document-editor.tsx`
  (표 rowspan/colspan·셀 배경·너비·bold/색 반영, 셀별 편집)
- 워크스페이스+라이브러리: `template-doc/template-workspace.tsx` (업로드/이전 양식 불러오기/삭제/HWPX 내려받기)
- 마운트: 신규 탭 "양식 자동작성" → `app/kanban/task/[id]/template/page.tsx` (`task-detail-tabs.tsx`에 링크)

### Phase 1 한계(차기 과제)
- **충실 렌더는 기본 수준** — rowspan/colspan·배경·근사 너비·일부 글자서식까지. 정확한 폰트·문단 가로정렬·다단·이미지/도형(자리표시)은 미반영.
- **빈칸 채움은 `run_index=0` 휴리스틱**(실제 양식에서 검증됨, 견고한 셀↔run 매핑은 Phase 2).
- **브라우저 시각 검증 미실시**(tsc만 통과) — 실제 렌더 모양은 앱 구동으로 확인 필요.
- **실적 데이터 AI 자동 채움 = Phase 2**, **`.hwp` = Phase 3**.

---

## 6. 미해결/추후 확인 사항
- 템플릿 라이브러리 범위: **region 단위 공유** 기본 가정(모든 task에서 재사용). task 전용 양식 필요 시 scope 필드 추가.
- 표영역 행 증식 정책: 실적 행 수가 템플릿 표 행 수를 초과할 때 행 자동 추가 vs 요약.
- 양식과 사업계획/사업평가 탭의 관계: 기존 고정 양식과 병행할지, 업로드 양식으로 대체할지.
