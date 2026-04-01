"""
直播流数据模型
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer
from sqlalchemy.sql import func
import uuid

from .user import Base


class Stream(Base):
    """直播流模型"""
    __tablename__ = "streams"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    # 基本信息
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    cover_url = Column(Text, nullable=True)
    # 前端兼容字段
    type = Column(String(20), default="hls", nullable=False)
    url = Column(Text, nullable=True)
    enabled = Column(Boolean, default=True, nullable=False)
    # 状态: pending / live / ended
    status = Column(String(20), default="pending", nullable=False, index=True)
    # 直播流地址（mock时为空）
    stream_url = Column(Text, nullable=True)
    playback_url = Column(Text, nullable=True)
    # 关联辩题
    debate_id = Column(String(50), nullable=True)
    # 主持人
    host_id = Column(String(50), nullable=True)
    host_name = Column(String(100), nullable=True)
    # 观看人数统计
    viewer_count = Column(Integer, default=0, nullable=False)
    peak_viewer_count = Column(Integer, default=0, nullable=False)
    # 时间
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.title,
            "title": self.title,
            "description": self.description,
            "coverUrl": self.cover_url,
            "type": self.type,
            "url": self.url,
            "enabled": self.enabled,
            "status": self.status,
            "isLive": self.status == "live",
            "streamUrl": self.stream_url,
            "playbackUrl": self.playback_url,
            "debateId": self.debate_id,
            "hostId": self.host_id,
            "hostName": self.host_name,
            "viewerCount": self.viewer_count,
            "peakViewerCount": self.peak_viewer_count,
            "scheduledAt": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "startedAt": self.started_at.isoformat() if self.started_at else None,
            "endedAt": self.ended_at.isoformat() if self.ended_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
