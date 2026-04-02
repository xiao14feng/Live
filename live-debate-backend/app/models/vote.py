"""
投票数据模型
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
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


class JudgeAssignment(Base):
    """评委席位分配（每个直播流 3 个席位）"""
    __tablename__ = "judge_assignments"
    __table_args__ = (
        UniqueConstraint("stream_id", "slot_index", name="uq_judge_assignment_stream_slot"),
    )

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    stream_id = Column(String(100), nullable=False, index=True)
    slot_index = Column(Integer, nullable=False)  # 1/2/3
    judge_user_id = Column(String(100), nullable=True, index=True)
    judge_name = Column(String(100), nullable=True)
    judge_avatar = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "stream_id": self.stream_id,
            "slot": self.slot_index,
            "userId": self.judge_user_id,
            "name": self.judge_name,
            "avatar": self.judge_avatar,
        }


class JudgeVote(Base):
    """评委投票（一个评委在一个直播流只能投一次）"""
    __tablename__ = "judge_votes"
    __table_args__ = (
        UniqueConstraint("stream_id", "judge_user_id", name="uq_judge_vote_stream_user"),
    )

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    stream_id = Column(String(100), nullable=False, index=True)
    judge_user_id = Column(String(100), nullable=False, index=True)
    judge_name = Column(String(100), nullable=True)
    side = Column(String(20), nullable=False)  # left/right
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "stream_id": self.stream_id,
            "judgeUserId": self.judge_user_id,
            "judgeName": self.judge_name,
            "side": self.side,
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
