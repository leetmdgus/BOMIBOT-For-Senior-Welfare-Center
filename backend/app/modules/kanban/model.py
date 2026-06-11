from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.core.database import Base


class KanbanProjectModel(Base):
    __tablename__ = "kanban_projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), index=True, nullable=False)
    number: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    team: Mapped[str | None] = mapped_column(String(128), nullable=True)
    manager: Mapped[str | None] = mapped_column(String(128), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    year: Mapped[str] = mapped_column(String(4), index=True, nullable=False)

    categories: Mapped[list["KanbanCategoryModel"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class KanbanCategoryModel(Base):
    __tablename__ = "kanban_categories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        ForeignKey("kanban_projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(32), nullable=False)
    color: Mapped[str] = mapped_column(String(64), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    project: Mapped[KanbanProjectModel] = relationship(back_populates="categories")
    tasks: Mapped[list["KanbanTaskModel"]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )


class KanbanTaskModel(Base):
    __tablename__ = "kanban_tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    category_id: Mapped[str] = mapped_column(
        ForeignKey("kanban_categories.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    assignee_name: Mapped[str] = mapped_column(String(128), default="", nullable=False)
    completed_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    category: Mapped[KanbanCategoryModel] = relationship(back_populates="tasks")
