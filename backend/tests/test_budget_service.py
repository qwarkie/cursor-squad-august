import pytest

from app.seed.budget import SEED_CATEGORIES, SEED_INCOME
from app.services.budget import (
    UnknownCategoryError,
    derive_totals,
    ensure_seed,
    reset_budget,
    to_response,
    update_category,
)

SEED_RATE = SEED_CATEGORIES["savings"] / SEED_INCOME


def test_derive_totals_seed_remaining_is_zero() -> None:
    totals = derive_totals(SEED_INCOME, dict(SEED_CATEGORIES))
    assert totals["total_allocated"] == 4200
    assert totals["remaining"] == 0
    assert totals["savings_rate"] == SEED_RATE
    assert totals["overspent"] is False


def test_derive_totals_overspent_only_when_remaining_negative() -> None:
    balanced = derive_totals(4200, dict(SEED_CATEGORIES))
    assert balanced["overspent"] is False

    over = dict(SEED_CATEGORIES)
    over["food"] = 700
    totals = derive_totals(4200, over)
    assert totals["remaining"] == -50
    assert totals["overspent"] is True


def test_ensure_seed_inserts_once(db_session) -> None:
    first = ensure_seed(db_session)
    second = ensure_seed(db_session)
    assert first.id == second.id
    assert first.month == "2026-05"
    assert first.income == 4200
    assert {row.key: row.amount for row in first.categories} == SEED_CATEGORIES


def test_update_category_does_not_change_siblings(db_session) -> None:
    ensure_seed(db_session)
    updated = update_category(db_session, "food", 550)
    amounts = {row.key: row.amount for row in updated.categories}
    assert amounts["food"] == 550
    assert amounts["housing"] == 1500
    assert amounts["transport"] == 350
    assert amounts["entertainment"] == 300
    assert amounts["savings"] == 1400
    body = to_response(updated)
    assert body.remaining == 100
    assert body.total_allocated == 4100
    assert body.overspent is False
    assert body.savings_rate == SEED_RATE


def test_update_unknown_category_raises(db_session) -> None:
    ensure_seed(db_session)
    with pytest.raises(UnknownCategoryError):
        update_category(db_session, "flights", 100)
    amounts = {row.key: row.amount for row in ensure_seed(db_session).categories}
    assert amounts == SEED_CATEGORIES


def test_reset_restores_seed_after_mutation(db_session) -> None:
    update_category(db_session, "food", 700)
    update_category(db_session, "housing", 1600)
    restored = reset_budget(db_session)
    body = to_response(restored)
    assert body.income == 4200
    assert body.categories.model_dump() == SEED_CATEGORIES
    assert body.remaining == 0
    assert body.overspent is False
    assert body.savings_rate == SEED_RATE
