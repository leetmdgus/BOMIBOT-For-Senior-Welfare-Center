"""지역별 JSON blob — task_detail·performance 등 전용 테이블 없이 여기에 저장.

| domain (PK 일부) | 용도 | 업무 키 (payload.runtime) |
|------------------|------|---------------------------|
| task_detail | 사업계획서·사업평가 | businessPlanByTaskId, evaluationByTaskId |
| performance | 실적 입력·월별계획 | inputManagementByTaskId, monthlyPlans |
| files, survey(시드), ebooks, reports, … | 각 기능 mock/JSON | 도메인별 구조 |

칸반 카드 메타(제목·담당)만 `kanban_tasks` SQL. 문서 본문은 위 JSON.
설문은 `surveys` 테이블로 분리됨 — task_detail은 아직 JSON 유지.
"""

from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.common.core.database import Base
from app.common.domain.region_store_domains import (
    DOMAIN_PERFORMANCE,
    DOMAIN_TASK_DETAIL,
)

# models/ 에서 도메인 이름 re-export (discoverability)
REGION_JSON_DOMAINS = (
    DOMAIN_TASK_DETAIL,
    DOMAIN_PERFORMANCE,
    "files",
    "ebooks",
    "reports",
    "version_history",
    "chat",
    "approvals",
)


class RegionJsonStoreModel(Base):
    """(region_id, domain) 복합 PK — task_detail·performance 포함."""

    __tablename__ = "region_json_stores"
    region_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("regions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    domain: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
