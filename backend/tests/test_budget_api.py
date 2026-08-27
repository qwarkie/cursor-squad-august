from app.seed.budget import SEED_CATEGORIES, SEED_INCOME

SEED_RATE = SEED_CATEGORIES["savings"] / SEED_INCOME


def assert_seed(body: dict) -> None:
    assert body["month"] == "2026-05"
    assert body["income"] == SEED_INCOME
    assert body["categories"] == SEED_CATEGORIES
    assert body["total_allocated"] == 4200
    assert body["remaining"] == 0
    assert body["overspent"] is False
    assert body["savings_rate"] == pytest_approx_rate(body["savings_rate"])
    assert isinstance(body["id"], int)
    assert "updated_at" in body


def pytest_approx_rate(value: float) -> float:
    assert abs(value - SEED_RATE) < 1e-9
    assert abs(value - 0.3333) < 1e-3
    return value


def test_health(client) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_budget_seeds_on_read(client) -> None:
    response = client.get("/api/budget")
    assert response.status_code == 200
    assert_seed(response.json())


def test_get_budget_does_not_duplicate_rows(client) -> None:
    first = client.get("/api/budget")
    second = client.get("/api/budget")
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert_seed(second.json())


def test_patch_food_persists_and_isolates(client) -> None:
    client.get("/api/budget")
    patched = client.patch("/api/budget/categories/food", json={"amount": 550})
    assert patched.status_code == 200
    body = patched.json()
    assert body["categories"]["food"] == 550
    assert body["categories"]["housing"] == 1500
    assert body["categories"]["transport"] == 350
    assert body["categories"]["entertainment"] == 300
    assert body["categories"]["savings"] == 1400
    assert body["total_allocated"] == 4100
    assert body["remaining"] == 100
    assert body["overspent"] is False
    assert abs(body["savings_rate"] - SEED_RATE) < 1e-9

    reread = client.get("/api/budget")
    assert reread.json()["categories"]["food"] == 550
    assert reread.json()["remaining"] == 100


def test_patch_food_700_is_overspent(client) -> None:
    response = client.patch("/api/budget/categories/food", json={"amount": 700})
    assert response.status_code == 200
    body = response.json()
    assert body["categories"]["food"] == 700
    assert body["remaining"] == -50
    assert body["overspent"] is True
    assert body["categories"]["savings"] == 1400


def test_patch_unknown_category_404(client) -> None:
    response = client.patch("/api/budget/categories/flights", json={"amount": 100})
    assert response.status_code == 404
    assert response.json() == {"detail": "Unknown category"}
    assert_seed(client.get("/api/budget").json())


def test_patch_negative_amount_422(client) -> None:
    response = client.patch("/api/budget/categories/food", json={"amount": -1})
    assert response.status_code == 422
    assert "detail" in response.json()
    assert_seed(client.get("/api/budget").json())


def test_patch_missing_amount_422(client) -> None:
    response = client.patch("/api/budget/categories/food", json={})
    assert response.status_code == 422


def test_patch_non_integer_amount_422(client) -> None:
    response = client.patch("/api/budget/categories/food", json={"amount": 12.5})
    assert response.status_code == 422


def test_patch_string_amount_422(client) -> None:
    response = client.patch("/api/budget/categories/food", json={"amount": "650"})
    assert response.status_code == 422


def test_patch_malformed_body_422(client) -> None:
    response = client.patch(
        "/api/budget/categories/food",
        content=b"{not-json",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422


def test_reset_restores_seed(client) -> None:
    client.patch("/api/budget/categories/food", json={"amount": 700})
    client.patch("/api/budget/categories/housing", json={"amount": 1800})
    reset = client.post("/api/budget/reset")
    assert reset.status_code == 200
    assert_seed(reset.json())
    assert_seed(client.get("/api/budget").json())


def test_items_api_still_works(client) -> None:
    created = client.post("/api/items", json={"title": "keep-me", "description": None})
    assert created.status_code == 201
    listed = client.get("/api/items")
    assert listed.status_code == 200
    assert listed.json()[0]["title"] == "keep-me"
