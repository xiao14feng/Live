"""
WebSocket API 路由
处理客户端 WebSocket 连接、心跳和消息分发
"""
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
from datetime import datetime

from ..services.websocket_manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    ws: WebSocket,
    stream_id: Optional[str] = Query(None, description="订阅指定直播流的实时数据"),
):
    """
    WebSocket 主入口。

    连接方式：
        ws://host:8000/ws                      # 全局订阅
        ws://host:8000/ws?stream_id=xxx        # 订阅指定直播流

    支持的客户端消息：
        {"type": "ping"}                                    → 心跳
        {"type": "register", "streamId": "xxx"}             → 注册/切换直播流

    服务端推送的消息类型：
        votesUpdate   - 投票数据更新
        debateUpdate  - 辩题信息更新
        liveStatus    - 直播状态变化
        pong          - 心跳响应
        connected     - 连接成功确认
    """
    await manager.connect(ws, stream_id=stream_id)
    try:
        # 发送连接成功确认
        await ws.send_text(json.dumps({
            "type": "connected",
            "streamId": stream_id,
            "data": {
                "message": "WebSocket 连接成功",
                "streamId": stream_id,
                **manager.get_stats(),
            },
            "timestamp": datetime.now().isoformat(),
        }, ensure_ascii=False))

        # 主消息循环
        while True:
            try:
                raw = await ws.receive_text()
            except Exception:
                break

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({
                    "type": "error",
                    "data": {"message": "无效的 JSON 格式"},
                    "timestamp": datetime.now().isoformat(),
                }, ensure_ascii=False))
                continue

            msg_type = data.get("type", "")

            # ── 心跳 ──
            if msg_type == "ping":
                await ws.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat(),
                }, ensure_ascii=False))

            # ── 注册/切换直播流 ──
            elif msg_type == "register":
                new_stream_id = data.get("streamId") or data.get("stream_id")
                if new_stream_id:
                    manager.bind_stream(ws, new_stream_id)
                    await ws.send_text(json.dumps({
                        "type": "registered",
                        "streamId": new_stream_id,
                        "data": {"message": f"已订阅直播流 {new_stream_id}"},
                        "timestamp": datetime.now().isoformat(),
                    }, ensure_ascii=False))

            # ── 未知消息类型 ──
            else:
                await ws.send_text(json.dumps({
                    "type": "error",
                    "data": {"message": f"未知消息类型: {msg_type}"},
                    "timestamp": datetime.now().isoformat(),
                }, ensure_ascii=False))

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(ws)


@router.get("/ws/stats")
async def ws_stats():
    """获取 WebSocket 连接统计（调试用）"""
    return {"success": True, "data": manager.get_stats()}
