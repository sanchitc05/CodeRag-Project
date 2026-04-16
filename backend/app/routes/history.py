"""History routes for viewing past queries."""

import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.query_history import QueryHistory
from app.models.user import User
from app.schemas.history_schemas import HistoryItem, HistoryListResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryListResponse)
def get_user_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get heavily paginated history list for the current user."""
    offset = (page - 1) * page_size

    total = db.query(QueryHistory).filter(QueryHistory.user_id == current_user.id).count()

    history_records = (
        db.query(QueryHistory)
        .filter(QueryHistory.user_id == current_user.id)
        .order_by(QueryHistory.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    items = []
    for record in history_records:
        items.append(
            HistoryItem(
                id=record.id,
                repo_id=record.repo_id,
                query=record.query,
                response=json.loads(record.response), # Needs parsing from text back to dict 
                created_at=record.created_at,
            )
        )

    return HistoryListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{history_id}", response_model=HistoryItem)
def get_history_detail(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific history item ensuring the user owns it."""
    record = db.query(QueryHistory).filter(QueryHistory.id == history_id, QueryHistory.user_id == current_user.id).first()
    
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History not found")

    return HistoryItem(
        id=record.id,
        repo_id=record.repo_id,
        query=record.query,
        response=json.loads(record.response),
        created_at=record.created_at,
    )


@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_detail(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a specific history item ensuring the user owns it."""
    record = db.query(QueryHistory).filter(QueryHistory.id == history_id, QueryHistory.user_id == current_user.id).first()
    
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History not found")

    db.delete(record)
    db.commit()
    return None
