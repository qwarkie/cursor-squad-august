# Data Model: Money World

## Entities

### Budget

One monthly plan. MVP stores exactly one row.

| Field | Type | Constraints |
|---|---|---|
| `id` | integer PK | generated |
| `month` | string `YYYY-MM` | unique, not null, MVP value `2026-05` |
| `income` | integer | not null, `>= 0`, seed `4200`, not updatable via MVP API |
| `updated_at` | datetime | not null, set on create and every category write / reset |

Relationships: has many `BudgetCategory`.

### BudgetCategory

One allocation inside a budget.

| Field | Type | Constraints |
|---|---|---|
| `id` | integer PK | generated |
| `budget_id` | FK → `budgets.id` | not null, cascade delete |
| `key` | string | not null; one of `housing`, `food`, `transport`, `entertainment`, `savings` |
| `amount` | integer | not null, `>= 0` |

Unique (`budget_id`, `key`). A budget MUST have all five keys after seed or reset.

## Derived fields (not stored)

Computed by `services/budget.py` and `engine/budget.ts` using the same formulas:

```
total_allocated = sum(category.amount)
remaining       = budget.income - total_allocated
savings_rate    = budget.income == 0 ? 0 : savings.amount / budget.income
overspent       = remaining < 0
```

Income is never 0 in the seed. The `income == 0` guard is only for defensive coding; no MVP endpoint can set income to 0.

## Seed (deterministic)

Source of truth for numbers: this table. Server copy: `backend/app/seed/budget.py`. Client copy: `frontend/src/fixtures/budget.ts`. They MUST be identical.

```json
{
  "month": "2026-05",
  "income": 4200,
  "categories": {
    "housing": 1500,
    "food": 650,
    "transport": 350,
    "entertainment": 300,
    "savings": 1400
  }
}
```

Derived seed: `total_allocated = 4200`, `remaining = 0`, `savings_rate = 0.3333…`, `overspent = false`.

## State transitions

```text
[no row] --GET or migrate+GET--> [seeded]
[any]    --PATCH category------> [same row, one amount changed, updated_at bumped]
[any]    --POST reset----------> [seeded amounts + income, updated_at bumped]
```

There is no delete endpoint. There is no create-budget endpoint; seed-on-read is the only insert.

## Validation rules

- `amount` integer, `>= 0` (Pydantic + DB check)
- `key` in the five-value enum
- `month` unique
- PATCH must not write other categories
- Reset writes all five seed amounts and seed income; it does not insert extra rows if the budget exists

## Migration requirements

- New Alembic revision with `down_revision = "69fd0530e630"`
- Create `budgets` and `budget_categories`
- Import the new model in `backend/alembic/env.py` so autogenerate sees it
- Do not drop `items`
- Seed rows are **not** required inside the migration; seed-on-read is mandatory so tests can start from empty tables

## Frontend fixture shape

```ts
export const SEED_MONTH = '2026-05'
export const SEED_INCOME = 4200
export const SEED_CATEGORIES = {
  housing: 1500,
  food: 650,
  transport: 350,
  entertainment: 300,
  savings: 1400,
} as const
```

Category display metadata (not persisted):

| key | label | district | Seed `data-units` |
|---|---|---|---|
| housing | Housing | Homes | 30 |
| food | Food | Market | 13 |
| transport | Transport | Roads | 7 |
| entertainment | Entertainment | Park | 6 |
| savings | Savings | Vault | 28 |

Visual construction rules: [spec.md — World visual mapping](./spec.md).
