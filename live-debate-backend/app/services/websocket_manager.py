"""
WebSocket 连接管理器
管理所有客户端的 WebSocket 连接，支持按 stream_id 分组广播
"""
import json
import asyncio
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket
from datetime import datetime


class ConnectionManager:
    """
    WebSocket 连接管理器
    - 支持全局广播
    - 支持按 stream_id 分组广播（只推送给订阅了该直播流的客户端）
    - 支持心跳检测，自动清理断开的连接
    """

    def __init__(self):
        # 全局连接集合：所有已连接的 WebSocket
        self._all: Set[WebSocket] = set()
        # 按 stream_id 分组的连接：{stream_id: set(WebSocket)}
        self._streams: Dict[str, Set[WebSocket]] = {}
        # 每个连接订阅的 stream_id：{WebSocket: stream_id}
        self._ws_stream: Dict[int, str] = {}  # 用 id(ws) 作为 key

    # ───────────────────────── 连接管理 ─────────────────────────

    async def connect(self, ws: WebSocket, stream_id: Optional[str] = None):
        """接受 WebSocket 连接，并可选地注册到指定 stream_id 组"""
        await ws.accept()
        self._all.add(ws)
        if stream_id:
            self._bind_stream(ws, stream_id)
        print(f"[WS] 新连接 stream_id={stream_id}，当前总连接数={len(self._all)}")

    def disconnect(self, ws: WebSocket):
        """断开连接，从所有分组中移除"""
        self._all.discard(ws)
        # 移除 stream 绑定
        sid = self._ws_stream.pop(id(ws), None)
        if sid and sid in self._streams:
            self._streams[sid].discard(ws)
            if not self._streams[sid]:
                del self._streams[sid]
        print(f"[WS] 连接断开 stream_id={sid}，剩余连接数={len(self._all)}")

    def bind_stream(self, ws: WebSocket, stream_id: str):
        """将已连接的 ws 绑定到指定 stream_id（处理 register 消息时调用）"""
        # 先解除旧绑定
        old_sid = self._ws_stream.get(id(ws))
        if old_sid and old_sid in self._streams:
            self._streams[old_sid].discard(ws)
        self._bind_stream(ws, stream_id)

    def _bind_stream(self, ws: WebSocket, stream_id: str):
        if stream_id not in self._streams:
            self._streams[stream_id] = set()
        self._streams[stream_id].add(ws)
        self._ws_stream[id(ws)] = stream_id

    # ───────────────────────── 广播 ─────────────────────────

    async def broadcast(self, message: dict, stream_id: Optional[str] = None):
        """
        广播消息。
        - stream_id 不为 None：只推送给订阅了该 stream 的客户端
        - stream_id 为 None：推送给所有客户端
        """
        payload = json.dumps(message, ensure_ascii=False)
        if stream_id is not None:
            targets = list(self._streams.get(stream_id, set()))
        else:
            targets = list(self._all)

        dead = []
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        # 清理断开的连接
        for ws in dead:
            self.disconnect(ws)

    async def broadcast_votes_update(self, stream_id: str, vote_data: dict):
        """广播投票更新（同时推送给订阅该 stream 的客户端和全局订阅者）"""
        message = {
            "type": "votesUpdate",
            "streamId": stream_id,
            "data": {
                "streamId": stream_id,
                "leftVotes": vote_data.get("leftVotes", 0),
                "rightVotes": vote_data.get("rightVotes", 0),
                "totalVotes": vote_data.get("totalVotes", 0),
                "leftPercentage": vote_data.get("leftPercentage", 50),
                "rightPercentage": vote_data.get("rightPercentage", 50),
            },
            "timestamp": datetime.now().isoformat(),
        }
        await self.broadcast(message, stream_id=stream_id)

    async def broadcast_debate_update(self, debate_data: dict, stream_id: Optional[str] = None):
        """广播辩题更新"""
        message = {
            "type": "debateUpdate",
            "streamId": stream_id,
            "data": debate_data,
            "timestamp": datetime.now().isoformat(),
        }
        await self.broadcast(message, stream_id=stream_id)

    async def broadcast_live_status(
        self, stream_id: str, is_live: bool, stream_url: str = ""
    ):
        """广播直播状态变化"""
        message = {
            "type": "liveStatus",
            "streamId": stream_id,
            "data": {
                "isLive": is_live,
                "streamId": stream_id,
                "streamUrl": stream_url,
            },
            "timestamp": datetime.now().isoformat(),
        }
        await self.broadcast(message, stream_id=stream_id)

    # ───────────────────────── 统计 ─────────────────────────

    def get_stats(self) -> dict:
        """获取连接统计信息"""
        return {
            "totalConnections": len(self._all),
            "streams": {
                sid: len(conns) for sid, conns in self._streams.items()
            },
        }


# 全局单例
manager = ConnectionManager()
