from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ItemBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    is_done: bool = False


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    """All fields optional — only what is sent gets changed."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    is_done: bool | None = None


class ItemRead(ItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
