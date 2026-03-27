"""
投票系统 API 路由
实现前端调用的全部投票接口（v1 + 兼容路径）
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..schemas.vote import VoteRequest, VoteRequestWrapper, VoteResponse, VoteData
from ..services.vote_service import VoteService, DEFAULT_STREAM_ID

router = APIRouter()
vote_service = VoteService()


# ==================== 获取投票数据 ====================

@router.get("/votes")
async def get_votes(
    stream_id: Optional[str] = Query(None, description="直播流ID"),
    db: Session = Depends(get_db),
):
    """获取当前投票数据 - GET /api/votes"""
    sid = stream_id or DEFAULT_STREAM_ID
    data = vote_service.get_votes(db, sid)
    return {"success": True, "data": data}


@router.get("/v1/votes")
async def get_votes_v1(
    stream_id: Optional[str] = Query(None, description="直播流ID"),
    db: Session = Depends(get_db),
):
    """获取当前投票数据 - GET /api/v1/votes"""
    sid = stream_id or DEFAULT_STREAM_ID
    data = vote_service.get_votes(db, sid)
    return {"success": True, "data": data}


# ==================== 用户投票 ====================

async def _parse_vote_body(request: Request) -> tuple[int, int, str, str]:
    """
    兼容两种请求体格式：
    - 直接格式: { leftVotes, rightVotes, streamId, userId }
    - 包装格式: { request: { leftVotes, rightVotes, streamId, userId } }
    """
    body = await request.json()

    # 包装格式
    if "request" in body and isinstance(body["request"], dict):
        body = body["request"]

    left = int(body.get("leftVotes", 0))
    right = int(body.get("rightVotes", 0))
    stream_id = body.get("streamId") or body.get("stream_id") or DEFAULT_STREAM_ID
    user_id = body.get("userId") or body.get("user_id") or "guest"
    return left, right, stream_id, user_id


@router.post("/user-vote")
async def user_vote(
    request: Request,
    db: Session = Depends(get_db),
):
    """用户投票 - POST /api/user-vote"""
    left, right, stream_id, user_id = await _parse_vote_body(request)
    try:
        data = vote_service.submit_vote(db, stream_id, left, right, user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"success": True, "data": data, "message": "投票成功"}


@router.post("/v1/user-vote")
async def user_vote_v1(
    request: Request,
    db: Session = Depends(get_db),
):
    """用户投票 - POST /api/v1/user-vote"""
    left, right, stream_id, user_id = await _parse_vote_body(request)
    try:
        data = vote_service.submit_vote(db, stream_id, left, right, user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"success": True, "data": data, "message": "投票成功"}


# ==================== 管理员接口 ====================

@router.get("/admin/votes")
async def admin_get_votes(
    stream_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """管理端获取投票数据 - GET /api/admin/votes"""
    sid = stream_id or DEFAULT_STREAM_ID
    data = vote_service.get_votes(db, sid)
    return {"success": True, "data": data}


@router.put("/admin/votes")
async def admin_set_votes(
    request: Request,
    db: Session = Depends(get_db),
):
    """管理端设置票数 - PUT /api/admin/votes"""
    body = await request.json()
    stream_id = body.get("streamId") or body.get("stream_id") or DEFAULT_STREAM_ID
    left = int(body.get("leftVotes", 0))
    right = int(body.get("rightVotes", 0))
    data = vote_service.set_votes(db, stream_id, left, right)
    return {"success": True, "data": data}


@router.post("/admin/votes/reset")
async def admin_reset_votes(
    request: Request,
    db: Session = Depends(get_db),
):
    """管理端重置票数 - POST /api/admin/votes/reset"""
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    stream_id = body.get("streamId") or body.get("stream_id") or DEFAULT_STREAM_ID
    data = vote_service.reset_votes(db, stream_id)
    return {"success": True, "data": data, "message": "票数已重置"}


@router.get("/admin/votes/statistics")
async def admin_vote_statistics(
    stream_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """管理端投票统计 - GET /api/admin/votes/statistics"""
    data = vote_service.get_statistics(db, stream_id)
    return {"success": True, "data": data}


@router.get("/v1/admin/votes/statistics")
async def admin_vote_statistics_v1(
    stream_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """管理端投票统计 v1 - GET /api/v1/admin/votes/statistics"""
    data = vote_service.get_statistics(db, stream_id)
    return {"success": True, "data": data}


# ==================== 用户投票状态查询 ====================

@router.get("/v1/user-votes")
async def get_user_votes(
    stream_id: str = Query(..., description="直播流ID"),
    user_id: str = Query(..., description="用户ID"),
    db: Session = Depends(get_db),
):
    """查询用户投票记录 - GET /api/v1/user-votes"""
    from ..models.vote import VoteRecord
    records = (
        db.query(VoteRecord)
        .filter(
            VoteRecord.stream_id == stream_id,
            VoteRecord.user_id == user_id,
        )
        .all()
    )
    total_left = sum(r.left_votes for r in records)
    total_right = sum(r.right_votes for r in records)
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "stream_id": stream_id,
            "hasVoted": len(records) > 0,
            "totalLeftVotes": total_left,
            "totalRightVotes": total_right,
            "voteCount": len(records),
        },
    }
