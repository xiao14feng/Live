"""
直播流业务逻辑服务
"""
import asyncio
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from ..models.stream import Stream
from ..models.debate import Debate


class LiveService:
    """直播流服务"""

    # ────────────────── 直播流CRUD ──────────────────

    def create_stream(
        self,
        db: Session,
        title: str,
        description: Optional[str] = None,
        cover_url: Optional[str] = None,
        debate_id: Optional[str] = None,
        host_id: Optional[str] = None,
        host_name: Optional[str] = None,
        scheduled_at: Optional[datetime] = None,
    ) -> Stream:
        """创建直播流"""
        stream = Stream(
            title=title,
            description=description,
            cover_url=cover_url,
            debate_id=debate_id,
            host_id=host_id,
            host_name=host_name,
            scheduled_at=scheduled_at,
            status="pending",
        )
        db.add(stream)
        db.commit()
        db.refresh(stream)
        return stream

    def get_stream(self, db: Session, stream_id: str) -> Optional[Stream]:
        """获取直播流详情"""
        return db.query(Stream).filter(Stream.id == stream_id).first()

    def list_streams(
        self,
        db: Session,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[Stream], int]:
        """获取直播流列表"""
        query = db.query(Stream)
        if status:
            query = query.filter(Stream.status == status)
        total = query.count()
        streams = query.order_by(Stream.created_at.desc()).offset(skip).limit(limit).all()
        return streams, total

    def update_stream(
        self,
        db: Session,
        stream_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        cover_url: Optional[str] = None,
        debate_id: Optional[str] = None,
        host_name: Optional[str] = None,
    ) -> Optional[Stream]:
        """更新直播流"""
        stream = self.get_stream(db, stream_id)
        if not stream:
            return None
        if title is not None:
            stream.title = title
        if description is not None:
            stream.description = description
        if cover_url is not None:
            stream.cover_url = cover_url
        if debate_id is not None:
            stream.debate_id = debate_id
        if host_name is not None:
            stream.host_name = host_name
        db.commit()
        db.refresh(stream)
        return stream

    def delete_stream(self, db: Session, stream_id: str) -> bool:
        """删除直播流"""
        stream = self.get_stream(db, stream_id)
        if not stream:
            return False
        db.delete(stream)
        db.commit()
        return True

    # ────────────────── 直播控制 ──────────────────

    def start_stream(self, db: Session, stream_id: str) -> Optional[Stream]:
        """开始直播"""
        stream = self.get_stream(db, stream_id)
        if not stream:
            return None
        stream.status = "live"
        stream.started_at = datetime.now()
        db.commit()
        db.refresh(stream)
        # 广播直播状态变化
        self._broadcast_live_status(stream_id, True, stream.stream_url or "")
        return stream

    def end_stream(self, db: Session, stream_id: str) -> Optional[Stream]:
        """结束直播"""
        stream = self.get_stream(db, stream_id)
        if not stream:
            return None
        stream.status = "ended"
        stream.ended_at = datetime.now()
        db.commit()
        db.refresh(stream)
        # 广播直播状态变化
        self._broadcast_live_status(stream_id, False)
        return stream

    def update_viewer_count(
        self, db: Session, stream_id: str, count: int
    ) -> Optional[Stream]:
        """更新观看人数"""
        stream = self.get_stream(db, stream_id)
        if not stream:
            return None
        stream.viewer_count = count
        if count > stream.peak_viewer_count:
            stream.peak_viewer_count = count
        db.commit()
        db.refresh(stream)
        return stream

    # ────────────────── 广播 ──────────────────

    def _broadcast_live_status(
        self, stream_id: str, is_live: bool, stream_url: str = ""
    ):
        """异步广播直播状态变化"""
        try:
            from .websocket_manager import manager
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(
                    manager.broadcast_live_status(stream_id, is_live, stream_url)
                )
        except Exception as e:
            print(f"[WS] 广播直播状态失败: {e}")

    # ────────────────── 统计 ──────────────────

    def get_stream_statistics(self, db: Session, stream_id: str) -> dict:
        """获取直播流统计"""
        stream = self.get_stream(db, stream_id)
        if not stream:
            return {}
        return {
            "streamId": stream.id,
            "title": stream.title,
            "status": stream.status,
            "viewerCount": stream.viewer_count,
            "peakViewerCount": stream.peak_viewer_count,
            "duration": self._calculate_duration(stream),
        }

    def _calculate_duration(self, stream: Stream) -> int:
        """计算直播时长（秒）"""
        if not stream.started_at:
            return 0
        end = stream.ended_at or datetime.now()
        delta = end - stream.started_at
        return int(delta.total_seconds())
