"""
AI内容数据模型
"""
from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean
from sqlalchemy.sql import func
import uuid

from .user import Base


class AIContent(Base):
    """AI内容模型"""
    __tablename__ = "ai_contents"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    # 基本信息
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    # 关联
    stream_id = Column(String(50), nullable=True, index=True)
    debate_id = Column(String(50), nullable=True)
    creator_id = Column(String(50), nullable=True)
    # 统计
    view_count = Column(Integer, default=0, nullable=False)
    like_count = Column(Integer, default=0, nullable=False)
    comment_count = Column(Integer, default=0, nullable=False)
    # 状态
    status = Column(String(20), default="published", nullable=False)  # draft / published / archived
    # 时间
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "summary": self.summary,
            "streamId": self.stream_id,
            "debateId": self.debate_id,
            "creatorId": self.creator_id,
            "viewCount": self.view_count,
            "likeCount": self.like_count,
            "commentCount": self.comment_count,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class Comment(Base):
    """评论模型"""
    __tablename__ = "comments"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    # 内容
    content = Column(Text, nullable=False)
    # 关联
    ai_content_id = Column(String(50), nullable=False, index=True)
    user_id = Column(String(50), nullable=False)
    user_name = Column(String(100), nullable=True)
    # 统计
    like_count = Column(Integer, default=0, nullable=False)
    # 状态
    status = Column(String(20), default="published", nullable=False)  # published / deleted / hidden
    # 时间
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "aiContentId": self.ai_content_id,
            "userId": self.user_id,
            "userName": self.user_name,
            "likeCount": self.like_count,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
