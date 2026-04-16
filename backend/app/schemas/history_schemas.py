"""Pydantic response models for query history endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class HistoryItem(BaseModel):
    id: int
    repo_id: Optional[str] = None
    query: str
    response: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HistoryListResponse(BaseModel):
    items: list[HistoryItem]
    total: int
    page: int
    page_size: int
