from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.seed.budget import CATEGORY_KEYS

_KEY_IN = ", ".join(f"'{key}'" for key in CATEGORY_KEYS)


class Budget(Base):
    """Singleton monthly plan. MVP stores one row for 2026-05."""

    __tablename__ = "budgets"
    __table_args__ = (CheckConstraint("income >= 0", name="ck_budgets_income_nonneg"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    month: Mapped[str] = mapped_column(unique=True)
    income: Mapped[int] = mapped_column()
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    categories: Mapped[list["BudgetCategory"]] = relationship(
        back_populates="budget",
        cascade="all, delete-orphan",
    )


class BudgetCategory(Base):
    """One named allocation belonging to a budget."""

    __tablename__ = "budget_categories"
    __table_args__ = (
        UniqueConstraint("budget_id", "key", name="uq_budget_categories_budget_id_key"),
        CheckConstraint("amount >= 0", name="ck_budget_categories_amount_nonneg"),
        CheckConstraint(f"key IN ({_KEY_IN})", name="ck_budget_categories_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    budget_id: Mapped[int] = mapped_column(ForeignKey("budgets.id", ondelete="CASCADE"))
    key: Mapped[str] = mapped_column()
    amount: Mapped[int] = mapped_column()

    budget: Mapped[Budget] = relationship(back_populates="categories")
