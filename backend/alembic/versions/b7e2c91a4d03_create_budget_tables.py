"""create budget tables

Revision ID: b7e2c91a4d03
Revises: 69fd0530e630
Create Date: 2026-08-26 19:20:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b7e2c91a4d03"
down_revision: str | None = "69fd0530e630"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "budgets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("month", sa.String(), nullable=False),
        sa.Column("income", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.CheckConstraint("income >= 0", name="ck_budgets_income_nonneg"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("month"),
    )
    op.create_table(
        "budget_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("budget_id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.CheckConstraint("amount >= 0", name="ck_budget_categories_amount_nonneg"),
        sa.CheckConstraint(
            "key IN ('housing', 'food', 'transport', 'entertainment', 'savings')",
            name="ck_budget_categories_key",
        ),
        sa.ForeignKeyConstraint(["budget_id"], ["budgets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("budget_id", "key", name="uq_budget_categories_budget_id_key"),
    )


def downgrade() -> None:
    op.drop_table("budget_categories")
    op.drop_table("budgets")
