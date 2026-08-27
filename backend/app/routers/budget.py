from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.budget import BudgetResponse, CategoryUpdate
from app.services.budget import (
    UnknownCategoryError,
    ensure_seed,
    reset_budget,
    to_response,
    update_category,
)

router = APIRouter(prefix="/budget", tags=["budget"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=BudgetResponse)
def get_budget(db: DbSession) -> BudgetResponse:
    return to_response(ensure_seed(db))


@router.patch("/categories/{category_key}", response_model=BudgetResponse)
def patch_category(
    category_key: str,
    payload: CategoryUpdate,
    db: DbSession,
) -> BudgetResponse:
    try:
        budget = update_category(db, category_key, payload.amount)
    except UnknownCategoryError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unknown category") from None
    return to_response(budget)


@router.post("/reset", response_model=BudgetResponse)
def post_reset(db: DbSession) -> BudgetResponse:
    return to_response(reset_budget(db))
