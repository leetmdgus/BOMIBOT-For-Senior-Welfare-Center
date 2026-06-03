"""surveys and survey_responses tables

Revision ID: 20260525_0004
Revises: 20260525_0003
Create Date: 2026-05-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260525_0004"
down_revision: Union[str, None] = "20260525_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table in inspector.get_table_names()


def upgrade() -> None:
    if not _table_exists("surveys"):
        op.create_table(
            "surveys",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("region_id", sa.String(length=64), nullable=False),
            sa.Column("task_id", sa.String(length=64), nullable=True),
            sa.Column("detail", sa.JSON(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["region_id"], ["regions.id"], ondelete="CASCADE"),
        )
        op.create_index("ix_surveys_region_id", "surveys", ["region_id"])
        op.create_index("ix_surveys_task_id", "surveys", ["task_id"])

    if not _table_exists("survey_responses"):
        op.create_table(
            "survey_responses",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("region_id", sa.String(length=64), nullable=False),
            sa.Column("survey_id", sa.String(length=64), nullable=False),
            sa.Column("answers", sa.JSON(), nullable=False),
            sa.Column(
                "submitted_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["region_id"], ["regions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"], ondelete="CASCADE"),
        )
        op.create_index("ix_survey_responses_region_id", "survey_responses", ["region_id"])
        op.create_index("ix_survey_responses_survey_id", "survey_responses", ["survey_id"])


def downgrade() -> None:
    if _table_exists("survey_responses"):
        op.drop_table("survey_responses")
    if _table_exists("surveys"):
        op.drop_table("surveys")
