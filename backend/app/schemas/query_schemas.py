"""Pydantic request/response models for query and ingestion endpoints."""

import re
from typing import Optional

from pydantic import BaseModel, field_validator


class IngestRequest(BaseModel):
    github_url: str
    repo_id: str

    @field_validator("github_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        if not v.startswith("https://github.com/"):
            raise ValueError("github_url must start with https://github.com/")
        return v

    @field_validator("repo_id")
    @classmethod
    def validate_repo_id(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-zA-Z0-9](?:[a-zA-Z0-9_-]{0,62}[a-zA-Z0-9])?$", v):
            raise ValueError(
                "repo_id must be 1-64 chars, use letters/numbers/_/-, and cannot start or end with _ or -"
            )
        return v


class QueryRequest(BaseModel):
    query: str
    repo_id: str

    @field_validator("query")
    @classmethod
    def validate_query_length(cls, v: str) -> str:
        if len(v) < 10:
            raise ValueError("Query must be at least 10 characters long")
        if len(v) > 1000:
            raise ValueError("Query must be at most 1000 characters long")
        return v


class EvidenceItem(BaseModel):
    file_path: str = ""
    start_line: int = 0
    end_line: int = 0
    content: str = ""
    name: str = ""


class QueryResponse(BaseModel):
    root_cause: Optional[str] = None
    suggested_fix: Optional[str] = None
    evidence: list[EvidenceItem] = []
    confidence: float = 0.0
    iterations: int = 0
    hypothesis_chain: list[str] = []
    session_id: int = 0
