"""
投票数据模型
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
import uuid

from .user import Base


class VoteRecord(Base):
    """用户投票记录"""
    __tablename__ = "vote_records"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(100), nullable=False, index=True)  # openid 或 guest
    stream_id = Column(String(100), nullable=False, index=True)
    left_votes = Column(Integer, default=0, nullable=False)
    right_votes = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "stream_id": self.stream_id,
            "left_votes": self.left_votes,
            "right_votes": self.right_votes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class VoteAggregate(Base):
    """投票汇总（每个 stream_id 一条记录）"""
    __tablename__ = "vote_aggregates"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    stream_id = Column(String(100), unique=True, nullable=False, index=True)
    left_votes = Column(Integer, default=0, nullable=False)
    right_votes = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self):
        total = self.left_votes + self.right_votes
        return {
            "stream_id": self.stream_id,
            "leftVotes": self.left_votes,
            "rightVotes": self.right_votes,
            "totalVotes": total,
            "leftPercentage": round((self.left_votes / total) * 100) if total > 0 else 50,
            "rightPercentage": round((self.right_votes / total) * 100) if total > 0 else 50,
        }
