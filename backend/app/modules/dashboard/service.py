"""하위 호환 — `DashboardService` 는 `app.modules.dashboard.engine` 로 이동.

기존 import 경로(`app.modules.dashboard.service`)를 유지하면서
실제 구현은 라이브 지표(조직·칸반·실적)를 반영하는 dashboard 패키지를 사용한다.
"""

from app.modules.dashboard.engine import DashboardService

__all__ = ["DashboardService"]
