"""Deterministic May 2026 seed. Must stay identical to frontend/src/fixtures/budget.ts."""

SEED_MONTH = "2026-05"
SEED_INCOME = 4200
SEED_CATEGORIES: dict[str, int] = {
    "housing": 1500,
    "food": 650,
    "transport": 350,
    "entertainment": 300,
    "savings": 1400,
}
CATEGORY_KEYS = tuple(SEED_CATEGORIES)
