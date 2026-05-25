"""google oauth and login events

Revision ID: 20260525_0003
Revises: 20260525_0002
Create Date: 2026-05-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260525_0003"
down_revision: Union[str, None] = "20260525_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table)}


def _table_exists(table: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table in inspector.get_table_names()


def upgrade() -> None:
    user_cols = _column_names("users")
    if "google_sub" not in user_cols:
        with op.batch_alter_table("users") as batch_op:
            batch_op.add_column(sa.Column("google_sub", sa.String(length=128), nullable=True))
            batch_op.add_column(
                sa.Column("google_refresh_token", sa.String(length=512), nullable=True)
            )
            batch_op.add_column(
                sa.Column("google_calendar_connected_at", sa.DateTime(timezone=True), nullable=True)
            )
            batch_op.create_index("ix_users_google_sub", ["google_sub"], unique=True)

    if not _table_exists("login_events"):
        op.create_table(
            "login_events",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("user_id", sa.String(length=64), nullable=True),
            sa.Column("region_id", sa.String(length=64), nullable=False),
            sa.Column("email", sa.String(length=320), nullable=False),
            sa.Column("provider", sa.String(length=32), nullable=False),
            sa.Column("success", sa.Boolean(), nullable=False),
            sa.Column("ip_address", sa.String(length=64), nullable=True),
            sa.Column("user_agent", sa.String(length=512), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        )
        op.create_index("ix_login_events_user_id", "login_events", ["user_id"])
        op.create_index("ix_login_events_region_id", "login_events", ["region_id"])


def downgrade() -> None:
    if _table_exists("login_events"):
        op.drop_table("login_events")

    user_cols = _column_names("users")
    if "google_sub" in user_cols:
        with op.batch_alter_table("users") as batch_op:
            batch_op.drop_index("ix_users_google_sub")
            batch_op.drop_column("google_calendar_connected_at")
            batch_op.drop_column("google_refresh_token")
            batch_op.drop_column("google_sub")
