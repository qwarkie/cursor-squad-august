from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.budget import Budget, BudgetCategory
from app.schemas.budget import BudgetResponse, CategoryMap
from app.seed.budget import CATEGORY_KEYS, SEED_CATEGORIES, SEED_INCOME, SEED_MONTH


class UnknownCategoryError(ValueError):
    """Raised when a PATCH targets a key outside the five-category enum."""


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def derive_totals(income: int, categories: dict[str, int]) -> dict[str, int | float | bool]:
    total_allocated = sum(categories.values())
    remaining = income - total_allocated
    savings = categories.get("savings", 0)
    savings_rate = 0.0 if income == 0 else savings / income
    return {
        "total_allocated": total_allocated,
        "remaining": remaining,
        "savings_rate": savings_rate,
        "overspent": remaining < 0,
    }


def category_map(budget: Budget) -> dict[str, int]:
    amounts = {row.key: row.amount for row in budget.categories}
    return {key: amounts[key] for key in CATEGORY_KEYS}


def to_response(budget: Budget) -> BudgetResponse:
    categories = category_map(budget)
    totals = derive_totals(budget.income, categories)
    return BudgetResponse(
        id=budget.id,
        month=budget.month,  # type: ignore[arg-type]
        income=budget.income,
        categories=CategoryMap(**categories),
        total_allocated=int(totals["total_allocated"]),
        remaining=int(totals["remaining"]),
        savings_rate=float(totals["savings_rate"]),
        overspent=bool(totals["overspent"]),
        updated_at=budget.updated_at,
    )


def _load_month(db: Session) -> Budget | None:
    return db.scalar(
        select(Budget).options(selectinload(Budget.categories)).where(Budget.month == SEED_MONTH)
    )


def _reload(db: Session) -> Budget:
    db.commit()
    loaded = _load_month(db)
    assert loaded is not None
    return loaded


def ensure_seed(db: Session) -> Budget:
    budget = _load_month(db)
    if budget is not None:
        return budget

    budget = Budget(month=SEED_MONTH, income=SEED_INCOME, updated_at=_now())
    budget.categories = [
        BudgetCategory(key=key, amount=amount) for key, amount in SEED_CATEGORIES.items()
    ]
    db.add(budget)
    return _reload(db)


def update_category(db: Session, key: str, amount: int) -> Budget:
    if key not in SEED_CATEGORIES:
        raise UnknownCategoryError(key)

    budget = ensure_seed(db)
    for row in budget.categories:
        if row.key == key:
            row.amount = amount
            break
    budget.updated_at = _now()
    return _reload(db)


def reset_budget(db: Session) -> Budget:
    budget = ensure_seed(db)
    budget.income = SEED_INCOME
    existing = {row.key: row for row in budget.categories}
    for key, amount in SEED_CATEGORIES.items():
        if key in existing:
            existing[key].amount = amount
        else:
            budget.categories.append(BudgetCategory(key=key, amount=amount))
    budget.updated_at = _now()
    return _reload(db)
