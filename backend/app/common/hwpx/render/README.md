# HWPX 렌더 파이프라인 (step2 + step3)

- **step2** `HWPX_TEMPLATES/step2_데이터 치환하기.ipynb` — file_json 치환
- **step3** `HWPX_TEMPLATES/step3_rendering_hwpx.ipynb` — `make_render_json` + `render_json_to_html` (미리보기)

---

## 전체 흐름

```
[템플릿 .hwpx]
    ex_사업계획서(2).hwpx   (plan)
    ex_사업평가 2.hwpx      (evaluation)
         │
         ▼
① ZIP → file_json  (hwpx_json.py + json_tree.py)
   · section0.xml / header.xml / settings.xml → JSON 트리
   · tag = {네임스페이스 URI}localname, tail·attrs 보존
   · lxml 파싱 (hp:/hs: 접두사 정보 유지)
         │
         ▼
② step3 make_render_json  (render_json_builder.py)
   · header → fonts / char_styles / para_styles
   · section → document.paragraphs (text_run + layout.linesegs)
   · step4 확장: hp:run 내 tbl → table run (사업계획·평가 표)
   · file_json["render"] = API renderJson
         │
         ├──────────────────────────────┐
         ▼                              ▼
③-A 미리보기 (step3)              ③-B 데이터 치환 (step2)
   html_preview.py                  apply_form.py
   POST .../render-html             cell_fill.py
   render_json_to_html              · cellAddr → hp:t .text
   프론트 render-json-preview       · attach_render_field() 재생성
         │                              │
         └──────────────┬───────────────┘
                        ▼
④ HWPX 다운로드  (byte_pack.py → zip_package.py)
   · section0 — 표 lxml 채움 + linesegarray 제거
   · PrvText — rebuild_plan_prv_bytes()
         │
         ▼
[다운로드 .hwpx]
```

---

## 모듈 역할

| 경로 | 역할 |
|------|------|
| `render/template_registry.py` | plan/evaluation 템플릿 (`templates/render/*.hwpx`, Docker 포함) |
| `render/hwpx_json.py` | HWPX/ZIP → `file_json` |
| `render/json_tree.py` | XML↔JSON, lxml 직렬화 |
| `render/render_json_builder.py` | **step3** `make_render_json` (+ step4 표) |
| `render/file_json_render.py` | file_json.render 필드 부착 |
| `render/html_style.py` | charPr/paraPr → CSS (색·정렬·밑줄·셀 배경) |
| `render/html_preview.py` | **step3** `render_json_to_html` (+ step4 표) |
| `render/cell_fill.py` | 표 셀 `hp:t` 텍스트 치환 |
| `render/apply_form.py` | formData/evaluation → 셀 매핑 |
| `render/template_cell_maps.py` | (row,col) ↔ 필드명 |
| `section0_byte_fill.py` | section0 표 채움·linesegarray 제거·PrvText 줄 단위 재구성 |
| `render/service.py` | 캐시·render_json·HWPX 빌드 |
| `export_service.py` | API용 파사드 |
| `render/byte_pack.py` | HWPX 다운로드 — section0+PrvText 패키징 |
| `encoding.py` | NFC, XML 금지문자, PrvText `<>` 이스케이프 |
| `prv_text.py` | Preview/PrvText.txt 본문 |
| `zip_package.py` | 한컴 호환 ZIP 재패킹 |

## HWPX 템플릿 병합 (`template_merge.py`)

여러 `.hwpx` 템플릿의 **section0.xml·PrvText.txt** 를 합칩니다. ZIP 골격(mimetype, header 등)은 **base** 파일을 유지합니다.

| mode | 설명 |
|------|------|
| `insert_reference` | addon 2열 참고 표 — base에 없으면 첫 표 뒤 삽입 |
| `replace_reference` | base 2열 참고 표를 addon과 1:1 교체 |
| `append` | addon section0 자식(hp:p)을 base 끝에 이어붙임 |

```powershell
cd backend

# 임의 템플릿 병합
py scripts/merge_hwpx_templates.py ex_사업계획.hwpx ex_대목차+본문.hwpx -o merged.hwpx

# preset (plan / evaluation + ex_대목차+본문)
py scripts/merge_hwpx_templates.py --preset plan -o merged_plan.hwpx --replace-reference

# plan/eval 원본에 참고 표 내장 (기존)
py scripts/embed_reference_table_in_templates.py --force
py scripts/sync_reference_table_templates.py
```

Python API:

```python
from app.common.hwpx.template_merge import SectionMergeMode, merge_hwpx_bytes, merge_hwpx_files

merged = merge_hwpx_bytes(base_bytes, addon_bytes, section_mode=SectionMergeMode.REPLACE_REFERENCE)
merge_hwpx_files("ex_사업계획.hwpx", "out.hwpx", "ex_대목차+본문.hwpx")
```

---

## 대목차·목차·본문 표 (ex_대목차+본문.hwpx)

| 항목 | 설명 |
|------|------|
| 추가본문 원본 | `HWPX_TEMPLATES/ex_대목차+본문.hwpx` — 9×2 단독 표 |
| plan | `ex_사업계획서(2).hwpx` — 요약 표(15×3) + 참고 표(9×2) |
| evaluation | `ex_사업평가 2.hwpx` — 요약 표(12×4, row10 슈퍼비전·row11 본문) + 참고 표(9×2) |
| 내장 | `py scripts/embed_reference_table_in_templates.py` — `ex_대목차+본문.hwpx` → plan/eval |
| 강제 교체 | `py scripts/embed_reference_table_in_templates.py --force` |
| 동기화 | `py scripts/sync_reference_table_templates.py` → `templates/render/*.hwpx` |

**sections → 표 행** (`reference_sections.py`):

- `heading` → 대목차 1행 (템플릿 행 0 복제)
- `body` → 목차 + 본문 2행 (템플릿 행 1·2 복제)
- 9행 초과 시 `plan_table_ops._lxml_ensure_reference_rows` 가 행 추가

**프론트 → HWPX**: `sections` 배열을 `/business-plan/hwpx` POST body에 포함 (`export-business-plan.ts`).

---

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST | `/business-plan/render-json` | 사업계획서 미리보기 JSON |
| POST | `/business-plan/render-html` | HTML 미리보기 |
| POST | `/business-plan/hwpx` | HWPX 다운로드 |
| GET/POST | `/evaluation/render-json` | 사업평가서 미리보기 |
| POST | `/evaluation/render-html` | HTML 미리보기 |
| POST | `/evaluation/hwpx` | HWPX 다운로드 |

---

## 한글 처리

1. **입력 정규화** — `sanitize_hwpx_text()`: Unicode NFC, XML 금지문자 제거
2. **XML 직렬화** — lxml + `nsmap` 보존 (`hp:`/`hs:` 접두사). ElementTree는 `ns0:`로 바뀌어 한컴 변조 검사에 걸릴 수 있음
3. **XML 선언** — `encoding="UTF-8" standalone="yes"` (템플릿과 동일)
4. **HWPX 다운로드** — section0 표 채움 + **linesegarray 제거** + PrvText 동기화 ([한컴 포럼](https://forum.developer.hancom.com/t/hwpx-section0-xml/2414) 권장)
5. **PrvText** — `rebuild_plan_prv_bytes()`로 줄 단위 동기화 (section0와 동일 formData, 바이트 길이 유지)
6. **ZIP** — mimetype·header 등 미변경 항목은 템플릿 원본 압축 스트림 복사

---

## 프론트엔드

| 파일 | 역할 |
|------|------|
| `lib/hwpx/render-json-types.ts` | render JSON 타입 |
| `lib/hwpx/use-hwpx-template-preview.ts` | POST render-html |
| `lib/hwpx/export-business-plan.ts` | API 모드 HWPX 다운로드 |
| `components/hwpx/hwpx-render-json-document.tsx` | 미리보기 UI |

FastAPI 모드(`isFastApiMode()`)에서만 백엔드 미리보기·다운로드가 동작합니다.

---

## 로컬 검증

```powershell
cd backend
py -3 scripts/verify_step3_notebook.py   # step3 make_render_json + HTML
py -3 scripts/verify_step2_notebook.py   # step2 치환 + HWPX roundtrip
```

생성 파일 (`_hwpx_verify_out/`):

- `step3_plan_preview.html` — step3 render_json_to_html (양식)
- `step3_plan_filled.html` — formData 치환 후 HTML
- `step2_cell3_roundtrip.hwpx` — 무치환 라운드트립
- `step2_cell4_replace.hwpx` — 사업명 등 한글 치환
- `plan_lineseg_fix.hwpx` — 다운로드 경로 (linesegarray 제거)

---

## 표 AST · 미리보기 · 다운로드 (4층 구조)

| 층 | 프론트 | 백엔드 |
|----|--------|--------|
| AST | `frontend-next/lib/hwp-ast/` | `app/common/hwpx/ast/` |
| Grid | `normalizeTableGrid.ts` | `normalize_table_grid.py` |
| Serializer | `astToHwpxTable` → hwpx-builder | `serializer_table.py` + template `byte_pack` |
| Page CSS | `pageCanvas.ts` + `HwpxPagePreview` | `render/page_canvas.py` |

- **다운로드**: `POST .../business-plan/hwpx`, `POST .../evaluation/hwpx` (기존 template 치환)
- **미리보기**: `POST .../business-plan/hwpx/preview`, `POST .../evaluation/hwpx/preview`  
  → `render_json` + A4 page canvas HTML (한글 **근사** — charPr pt·borderFill 0.12mm·HWPUNIT 셀 크기·`hh:style`·라벨 `#ececec`)
- **본문 리치텍스트 표**: HTML → AST → `HwpxTable` (`html_blocks.py`)

---

## 레거시 (사용 안 함)

`builder.py`, `section0_ok_template.py` 등은 이전 실험용입니다.  
**미리보기**는 step3 `render/` · **다운로드**는 `byte_pack.py` + `section0_byte_fill.py` 를 사용합니다.
