from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func

from app.database import Base


class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    repo_id = Column(String(255), nullable=True, index=True)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
