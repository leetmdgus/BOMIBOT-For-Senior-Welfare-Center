"""organization edit permissions

Revision ID: 20260525_0002
Revises: 20260523_0001
Create Date: 2026-05-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260525_0002"
down_revision: Union[str, None] = "20260523_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table)}


def upgrade() -> None:
    employee_cols = _column_names("employees")
    if "is_team_leader" not in employee_cols:
        op.add_column(
            "employees",
            sa.Column("is_team_leader", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    user_cols = _column_names("users")
    if "employee_id" not in user_cols:
        with op.batch_alter_table("users") as batch_op:
            batch_op.add_column(
                sa.Column("employee_id", sa.String(length=64), nullable=True),
            )
            batch_op.create_index("ix_users_employee_id", ["employee_id"])
            batch_op.create_foreign_key(
                "fk_users_employee_id",
                "employees",
                ["employee_id"],
                ["id"],
            )


def downgrade() -> None:
    user_cols = _column_names("users")
    if "employee_id" in user_cols:
        with op.batch_alter_table("users") as batch_op:
            batch_op.drop_constraint("fk_users_employee_id", type_="foreignkey")
            batch_op.drop_index("ix_users_employee_id")
            batch_op.drop_column("employee_id")

    employee_cols = _column_names("employees")
    if "is_team_leader" in employee_cols:
        op.drop_column("employees", "is_team_leader")
