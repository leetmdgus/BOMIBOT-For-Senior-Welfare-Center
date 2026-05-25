from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RegionJsonStoreModel(Base):
    __tablename__ = "region_json_stores"

    region_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("regions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    domain: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
