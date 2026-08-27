from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt


class CategoryMap(BaseModel):
    model_config = ConfigDict(extra="forbid")

    housing: int = Field(ge=0)
    food: int = Field(ge=0)
    transport: int = Field(ge=0)
    entertainment: int = Field(ge=0)
    savings: int = Field(ge=0)


class CategoryUpdate(BaseModel):
    """Absolute monthly amount in integer USD."""

    model_config = ConfigDict(extra="forbid")

    amount: StrictInt = Field(ge=0)


class BudgetResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    month: Literal["2026-05"]
    income: int = Field(ge=0)
    categories: CategoryMap
    total_allocated: int
    remaining: int
    savings_rate: float
    overspent: bool
    updated_at: datetime
