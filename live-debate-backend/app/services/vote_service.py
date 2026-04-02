"""
投票业务逻辑服务
"""
import asyncio
from sqlalchemy.orm import Session
from typing import Optional

from ..models.vote import VoteAggregate, VoteRecord
from ..models.debate import Debate


DEFAULT_STREAM_ID = "default"

DEFAULT_DEBATE = {
    "title": "如果有一个能一键消除痛苦的按钮，你会按吗？",
    "description": "这是一个关于痛苦、成长与人性选择的深度辩论",
    "left_position": "会按",
    "right_position": "不会按",
}


class VoteService:
    """投票服务"""

    # -------------------- 汇总数据 --------------------

    def get_aggregate(self, db: Session, stream_id: str) -> VoteAggregate:
        """获取或创建投票汇总"""
        agg = db.query(VoteAggregate).filter(VoteAggregate.stream_id == stream_id).first()
        if not agg:
            agg = VoteAggregate(stream_id=stream_id, left_votes=0, right_votes=0)
            db.add(agg)
            db.commit()
            db.refresh(agg)
        return agg

    def get_votes(self, db: Session, stream_id: str = DEFAULT_STREAM_ID) -> dict:
        """获取当前投票数据"""
        agg = self.get_aggregate(db, stream_id)
        return agg.to_dict()

    def submit_vote(
        self,
        db: Session,
        stream_id: str,
        left_votes: int,
        right_votes: int,
        user_id: str = "guest",
    ) -> dict:
        total = left_votes + right_votes
        if total <= 0:
            raise ValueError("票数必须大于0")

        # 写入记录
        record = VoteRecord(
            user_id=user_id,
            stream_id=stream_id,
            left_votes=left_votes,
            right_votes=right_votes,
        )
        db.add(record)

        # 累加汇总
        agg = self.get_aggregate(db, stream_id)
        agg.left_votes += left_votes
        agg.right_votes += right_votes
        db.commit()
        db.refresh(agg)

        result = agg.to_dict()

        # 广播实时更新（非阻塞）
        self._broadcast_votes(stream_id, result)

        return result

    def _broadcast_votes(self, stream_id: str, vote_data: dict):
        """异步广播投票更新（在当前事件循环中调度，不阻塞同步代码）"""
        try:
            from .websocket_manager import manager
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(
                    manager.broadcast_votes_update(stream_id, vote_data)
                )
        except Exception as e:
            print(f"[WS] 广播投票更新失败: {e}")

    def reset_votes(self, db: Session, stream_id: str = DEFAULT_STREAM_ID) -> dict:
        """重置投票"""
        agg = self.get_aggregate(db, stream_id)
        agg.left_votes = 0
        agg.right_votes = 0
        db.commit()
        db.refresh(agg)
        result = agg.to_dict()
        self._broadcast_votes(stream_id, result)
        return result

    def set_votes(
        self, db: Session, stream_id: str, left_votes: int, right_votes: int
    ) -> dict:
        """直接设置票数（管理员）"""
        agg = self.get_aggregate(db, stream_id)
        agg.left_votes = left_votes
        agg.right_votes = right_votes
        db.commit()
        db.refresh(agg)
        result = agg.to_dict()
        self._broadcast_votes(stream_id, result)
        return result

    def get_statistics(self, db: Session, stream_id: Optional[str] = None) -> dict:
        """投票统计"""
        if stream_id:
            agg = self.get_aggregate(db, stream_id)
            data = agg.to_dict()
        else:
            # 全局汇总
            from sqlalchemy import func
            row = db.query(
                func.sum(VoteAggregate.left_votes),
                func.sum(VoteAggregate.right_votes),
            ).first()
            left = row[0] or 0
            right = row[1] or 0
            total = left + right
            data = {
                "leftVotes": left,
                "rightVotes": right,
                "totalVotes": total,
                "leftPercentage": round((left / total) * 100) if total > 0 else 50,
                "rightPercentage": round((right / total) * 100) if total > 0 else 50,
            }

        # 简单时间轴（模拟）
        from datetime import datetime, timedelta
        now = datetime.now()
        timeline = [
            {
                "timestamp": (now - timedelta(minutes=10 - i)).isoformat(),
                "leftVotes": round(data["leftVotes"] * i / 10),
                "rightVotes": round(data["rightVotes"] * i / 10),
                "totalVotes": round(data["totalVotes"] * i / 10),
            }
            for i in range(11)
        ]

        return {
            "summary": data,
            "timeline": timeline,
            "topVoters": [],
        }

    # -------------------- 辩题 --------------------

    def get_active_debate(self, db: Session) -> Debate:
        """获取当前激活辩题，不存在则创建默认辩题"""
        debate = db.query(Debate).filter(Debate.is_active == True).first()
        if not debate:
            debate = Debate(**DEFAULT_DEBATE)
            db.add(debate)
            db.commit()
            db.refresh(debate)
        return debate

    def get_debate_topic(self, db: Session, stream_id: Optional[str] = None) -> dict:
        """获取辩题（stream_id 暂时忽略，返回全局激活辩题）"""
        debate = self.get_active_debate(db)
        return debate.to_dict()

    def update_debate(
        self,
        db: Session,
        title: Optional[str] = None,
        description: Optional[str] = None,
        left_position: Optional[str] = None,
        right_position: Optional[str] = None,
    ) -> dict:
        """更新辩题，并广播给所有 WebSocket 客户端"""
        debate = self.get_active_debate(db)
        if title is not None:
            debate.title = title
        if description is not None:
            debate.description = description
        if left_position is not None:
            debate.left_position = left_position
        if right_position is not None:
            debate.right_position = right_position
        db.commit()
        db.refresh(debate)
        result = debate.to_dict()

        # 广播辩题更新（非阻塞）
        try:
            from .websocket_manager import manager
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(
                    manager.broadcast_debate_update(result)
                )
        except Exception as e:
            print(f"[WS] 广播辩题更新失败: {e}")

        return result
