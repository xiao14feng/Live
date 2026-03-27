"""
辩题数据模型
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
import uuid

from .user import Base


class Debate(Base):
    """辩题模型"""
    __tablename__ = "debates"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    left_position = Column(String(100), nullable=False, default="正方")
    right_position = Column(String(100), nullable=False, default="反方")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "leftPosition": self.left_position,
            "rightPosition": self.right_position,
            "leftSide": self.left_position,
            "rightSide": self.right_position,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
