"""
辩题管理 API 路由
"""
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..services.vote_service import VoteService

router = APIRouter()
vote_service = VoteService()


# ==================== 前端辩题接口 ====================

@router.get("/debate-topic")
async def get_debate_topic(
    stream_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """获取当前辩题 - GET /api/debate-topic"""
    data = vote_service.get_debate_topic(db, stream_id)
    return {"success": True, "data": data}


@router.get("/v1/debate-topic")
async def get_debate_topic_v1(
    stream_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """获取当前辩题 v1 - GET /api/v1/debate-topic"""
    data = vote_service.get_debate_topic(db, stream_id)
    return {"success": True, "data": data}


# ==================== 管理员辩题接口 ====================

@router.get("/admin/debate")
async def admin_get_debate(
    db: Session = Depends(get_db),
):
    """获取辩论设置 - GET /api/admin/debate"""
    data = vote_service.get_debate_topic(db)
    return {"success": True, "data": data}


@router.put("/admin/debate")
async def admin_update_debate(
    request: Request,
    db: Session = Depends(get_db),
):
    """更新辩论设置 - PUT /api/admin/debate"""
    body = await request.json()
    data = vote_service.update_debate(
        db,
        title=body.get("title"),
        description=body.get("description"),
        left_position=body.get("leftPosition") or body.get("left_position"),
        right_position=body.get("rightPosition") or body.get("right_position"),
    )
    return {"success": True, "data": data, "message": "辩题已更新"}
