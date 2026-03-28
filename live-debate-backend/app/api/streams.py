"""
直播流管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..services.live_service import LiveService

router = APIRouter()
live_service = LiveService()


# ==================== 前端直播流接口 ====================

@router.get("/streams")
async def get_streams(
    status: Optional[str] = Query(None, description="直播状态: pending/live/ended"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取直播流列表 - GET /api/streams"""
    streams, total = live_service.list_streams(db, status=status, skip=skip, limit=limit)
    return {
        "success": True,
        "data": {
            "streams": [s.to_dict() for s in streams],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }


@router.get("/streams/{stream_id}")
async def get_stream(
    stream_id: str,
    db: Session = Depends(get_db),
):
    """获取直播流详情 - GET /api/streams/{stream_id}"""
    stream = live_service.get_stream(db, stream_id)
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="直播流不存在")
    return {"success": True, "data": stream.to_dict()}


@router.get("/live/status")
async def get_live_status(
    stream_id: str = Query(..., description="直播流ID"),
    db: Session = Depends(get_db),
):
    """获取直播状态 - GET /api/live/status"""
    stream = live_service.get_stream(db, stream_id)
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="直播流不存在")
    return {
        "success": True,
        "data": {
            "streamId": stream.id,
            "isLive": stream.status == "live",
            "status": stream.status,
            "viewerCount": stream.viewer_count,
        },
    }


# ==================== 管理员直播流接口 ====================

@router.post("/admin/streams")
async def create_stream(
    request: Request,
    db: Session = Depends(get_db),
):
    """创建直播流 - POST /api/admin/streams"""
    body = await request.json()
    stream = live_service.create_stream(
        db,
        title=body.get("title", "未命名直播"),
        description=body.get("description"),
        cover_url=body.get("coverUrl") or body.get("cover_url"),
        debate_id=body.get("debateId") or body.get("debate_id"),
        host_id=body.get("hostId") or body.get("host_id"),
        host_name=body.get("hostName") or body.get("host_name"),
        scheduled_at=None,
    )
    return {"success": True, "data": stream.to_dict(), "message": "直播流已创建"}


@router.get("/admin/streams")
async def admin_list_streams(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取直播流列表（管理端） - GET /api/admin/streams"""
    streams, total = live_service.list_streams(db, status=status, skip=skip, limit=limit)
    return {
        "success": True,
        "data": {
            "streams": [s.to_dict() for s in streams],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }


@router.put("/admin/streams/{stream_id}")
async def update_stream(
    stream_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """更新直播流 - PUT /api/admin/streams/{stream_id}"""
    body = await request.json()
    stream = live_service.update_stream(
        db,
        stream_id,
        title=body.get("title"),
        description=body.get("description"),
        cover_url=body.get("coverUrl") or body.get("cover_url"),
        debate_id=body.get("debateId") or body.get("debate_id"),
        host_name=body.get("hostName") or body.get("host_name"),
    )
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="直播流不存在")
    return {"success": True, "data": stream.to_dict(), "message": "直播流已更新"}


@router.delete("/admin/streams/{stream_id}")
async def delete_stream(
    stream_id: str,
    db: Session = Depends(get_db),
):
    """删除直播流 - DELETE /api/admin/streams/{stream_id}"""
    if not live_service.delete_stream(db, stream_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="直播流不存在")
    return {"success": True, "message": "直播流已删除"}


# ==================== 直播控制接口 ====================

@router.post("/admin/live/control")
async def admin_control_live(
    request: Request,
    db: Session = Depends(get_db),
):
    """直播控制（管理员） - POST /api/admin/live/control"""
    body = await request.json()
    stream_id = body.get("streamId") or body.get("stream_id")
    action = body.get("action")  # start / end

    if not stream_id or not action:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="缺少 streamId 或 action 参数",
        )

    if action == "start":
        stream = live_service.start_stream(db, stream_id)
    elif action == "end":
        stream = live_service.end_stream(db, stream_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的 action，应为 start 或 end",
        )

    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="直播流不存在")

    return {
        "success": True,
        "data": stream.to_dict(),
        "message": f"直播已{('开始' if action == 'start' else '结束')}",
    }


@router.post("/live/control")
async def user_control_live(
    request: Request,
    db: Session = Depends(get_db),
):
    """直播控制（用户） - POST /api/live/control"""
    body = await request.json()
    stream_id = body.get("streamId") or body.get("stream_id")
    action = body.get("action")  # start / end

    if not stream_id or not action:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="缺少 streamId 或 action 参数",
        )

    if action == "start":
        stream = live_service.start_stream(db, stream_id)
    elif action == "end":
        stream = live_service.end_stream(db, stream_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的 action，应为 start 或 end",
        )

    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="直播流不存在")

    return {
        "success": True,
        "data": stream.to_dict(),
        "message": f"直播已{('开始' if action == 'start' else '结束')}",
    }


# ==================== 统计接口 ====================

@router.get("/admin/streams/{stream_id}/statistics")
async def get_stream_statistics(
    stream_id: str,
    db: Session = Depends(get_db),
):
    """获取直播流统计 - GET /api/admin/streams/{stream_id}/statistics"""
    stats = live_service.get_stream_statistics(db, stream_id)
    if not stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="直播流不存在")
    return {"success": True, "data": stats}
