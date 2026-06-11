from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.core.database import Base


class SurveyModel(Base):
    __tablename__ = "surveys"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    region_id: Mapped[str] = mapped_column(
        ForeignKey("regions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    task_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    detail: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    responses: Mapped[list["SurveyResponseModel"]] = relationship(
        back_populates="survey", cascade="all, delete-orphan"
    )


class SurveyResponseModel(Base):
    __tablename__ = "survey_responses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    region_id: Mapped[str] = mapped_column(
        ForeignKey("regions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    survey_id: Mapped[str] = mapped_column(
        ForeignKey("surveys.id", ondelete="CASCADE"), index=True, nullable=False
    )
    answers: Mapped[dict] = mapped_column(JSON, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    survey: Mapped[SurveyModel] = relationship(back_populates="responses")
