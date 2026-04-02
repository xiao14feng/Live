"""
投票系统 API 路由
实现前端调用的全部投票接口（v1 + 兼容路径）
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..services.vote_service import VoteService, DEFAULT_STREAM_ID
from ..models.vote import VoteRecord, JudgeAssignment, JudgeVote

router = APIRouter()
vote_service = VoteService()


# ==================== 获取投票数据 ====================

@router.get("/votes")
async def get_votes(
    stream_id: Optional[str] = Query(None, description="直播流ID"),
    db: Session = Depends(get_db),
):
    sid = stream_id or DEFAULT_STREAM_ID
    data = vote_service.get_votes(db, sid)
    return {"success": True, "data": data}


@router.get("/v1/votes")
async def get_votes_v1(
    stream_id: Optional[str] = Query(None, description="直播流ID"),
    db: Session = Depends(get_db),
):
    sid = stream_id or DEFAULT_STREAM_ID
    data = vote_service.get_votes(db, sid)
    return {"success": True, "data": data}


# ==================== 用户投票 ====================

async def _parse_vote_body(request: Request) -> tuple[int, int, str, str]:
    body = await request.json()
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
    left, right, stream_id, user_id = await _parse_vote_body(request)
    
    # 用户投票：每人1票，转换为100票分配制
    if left + right != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="每次只能投1票")
    
    # 检查是否已投票
    existing = db.query(VoteRecord).filter(
        VoteRecord.stream_id == stream_id,
        VoteRecord.user_id == user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="您已经投过票了")
    
    # 转换为100票分配制
    left_100 = left * 100
    right_100 = right * 100
    
    try:
        data = vote_service.submit_vote(db, stream_id, left_100, right_100, user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"success": True, "data": data, "message": "投票成功"}


@router.post("/v1/user-vote")
async def user_vote_v1(
    request: Request,
    db: Session = Depends(get_db),
):
    left, right, stream_id, user_id = await _parse_vote_body(request)
    
    # 用户投票：每人1票，转换为100票分配制
    if left + right != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="每次只能投1票")
    
    # 检查是否已投票
    existing = db.query(VoteRecord).filter(
        VoteRecord.stream_id == stream_id,
        VoteRecord.user_id == user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="您已经投过票了")
    
    # 转换为100票分配制
    left_100 = left * 100
    right_100 = right * 100
    
    try:
        data = vote_service.submit_vote(db, stream_id, left_100, right_100, user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"success": True, "data": data, "message": "投票成功"}


# ==================== 管理员票数接口 ====================

@router.get("/admin/votes")
async def admin_get_votes(
    stream_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    sid = stream_id or DEFAULT_STREAM_ID
    data = vote_service.get_votes(db, sid)
    return {"success": True, "data": data}


@router.put("/admin/votes")
async def admin_set_votes(
    request: Request,
    db: Session = Depends(get_db),
):
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
    data = vote_service.get_statistics(db, stream_id)
    return {"success": True, "data": data}


@router.get("/v1/admin/votes/statistics")
async def admin_vote_statistics_v1(
    stream_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    data = vote_service.get_statistics(db, stream_id)
    return {"success": True, "data": data}


# ==================== 用户投票状态查询 ====================

@router.get("/v1/user-votes")
async def get_user_votes(
    stream_id: str = Query(..., description="直播流ID"),
    user_id: str = Query(..., description="用户ID"),
    db: Session = Depends(get_db),
):
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


# ==================== 评委分配与评委投票 ====================

@router.get("/v1/admin/judges")
async def get_judges_assignments(
    stream_id: str = Query(..., description="直播流ID"),
    db: Session = Depends(get_db),
):
    assignments = (
        db.query(JudgeAssignment)
        .filter(JudgeAssignment.stream_id == stream_id)
        .order_by(JudgeAssignment.slot_index.asc())
        .all()
    )
    votes = (
        db.query(JudgeVote)
        .filter(JudgeVote.stream_id == stream_id)
        .order_by(JudgeVote.created_at.asc())
        .all()
    )

    if not assignments:
        judges = [
            {"slot": 1, "userId": None, "name": "", "avatar": "", "role": "judge", "votes": 0},
            {"slot": 2, "userId": None, "name": "", "avatar": "", "role": "judge", "votes": 0},
            {"slot": 3, "userId": None, "name": "", "avatar": "", "role": "judge", "votes": 0},
        ]
    else:
        judges = [
            {
                "slot": a.slot_index,
                "userId": a.judge_user_id,
                "name": a.judge_name or "",
                "avatar": a.judge_avatar or "",
                "role": "judge",
                "votes": 0,
            }
            for a in assignments
        ]

    return {
        "success": True,
        "data": {
            "streamId": stream_id,
            "judges": judges,
            "judgeVotes": [v.to_dict() for v in votes],
        },
    }


@router.post("/v1/admin/judges")
async def save_judges_assignments(
    request: Request,
    db: Session = Depends(get_db),
):
    body = await request.json()
    stream_id = body.get("stream_id") or body.get("streamId")
    judges = body.get("judges") or []

    if not stream_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少 stream_id")
    if not isinstance(judges, list) or len(judges) != 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="评委席位必须是3个")

    selected_ids = [str(j.get("userId")) for j in judges if j.get("userId")]
    if len(selected_ids) != len(set(selected_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="同一个评委不能重复选择")

    for i, judge in enumerate(judges, start=1):
        row = (
            db.query(JudgeAssignment)
            .filter(
                JudgeAssignment.stream_id == stream_id,
                JudgeAssignment.slot_index == i,
            )
            .first()
        )
        if not row:
            row = JudgeAssignment(stream_id=stream_id, slot_index=i)
            db.add(row)

        row.judge_user_id = judge.get("userId") or None
        row.judge_name = judge.get("name") or ""
        row.judge_avatar = judge.get("avatar") or ""

    db.commit()
    return {"success": True, "message": "评委分配已保存"}


@router.get("/v1/judge-vote/status")
async def get_judge_vote_status(
    stream_id: str = Query(..., description="直播流ID"),
    user_id: str = Query(..., description="用户ID"),
    db: Session = Depends(get_db),
):
    assignment = (
        db.query(JudgeAssignment)
        .filter(
            JudgeAssignment.stream_id == stream_id,
            JudgeAssignment.judge_user_id == user_id,
        )
        .first()
    )
    existed_vote = (
        db.query(JudgeVote)
        .filter(
            JudgeVote.stream_id == stream_id,
            JudgeVote.judge_user_id == user_id,
        )
        .first()
    )

    return {
        "success": True,
        "data": {
            "streamId": stream_id,
            "userId": user_id,
            "isAssignedJudge": assignment is not None,
            "slot": assignment.slot_index if assignment else None,
            "judgeName": assignment.judge_name if assignment else None,
            "hasVoted": existed_vote is not None,
            "votedSide": existed_vote.side if existed_vote else None,
            "todoRequired": assignment is not None and existed_vote is None,
        },
    }


@router.post("/v1/judge-vote")
async def submit_judge_vote(
    request: Request,
    db: Session = Depends(get_db),
):
    body = await request.json()
    stream_id = body.get("stream_id") or body.get("streamId")
    user_id = body.get("user_id") or body.get("userId")
    side = (body.get("side") or "").lower()

    if side not in ("left", "right"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="side 只能是 left 或 right")
    if not stream_id or not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少 stream_id 或 user_id")

    assignment = (
        db.query(JudgeAssignment)
        .filter(
            JudgeAssignment.stream_id == stream_id,
            JudgeAssignment.judge_user_id == user_id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="你不是该直播间已分配评委")

    existed = (
        db.query(JudgeVote)
        .filter(
            JudgeVote.stream_id == stream_id,
            JudgeVote.judge_user_id == user_id,
        )
        .first()
    )
    if existed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该评委已投票，不能重复投票")

    new_vote = JudgeVote(
        stream_id=stream_id,
        judge_user_id=user_id,
        judge_name=assignment.judge_name,
        side=side,
    )
    db.add(new_vote)

    agg = vote_service.get_aggregate(db, stream_id)
    if side == "left":
        agg.left_votes += 1
    else:
        agg.right_votes += 1

    db.commit()
    db.refresh(agg)

    return {
        "success": True,
        "message": "评委投票成功",
        "data": {
            "vote": new_vote.to_dict(),
            "aggregate": agg.to_dict(),
        },
    }


@router.get("/v1/admin/judge-votes")
async def get_admin_judge_votes(
    stream_id: str = Query(..., description="直播流ID"),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(JudgeVote)
        .filter(JudgeVote.stream_id == stream_id)
        .order_by(JudgeVote.created_at.asc())
        .all()
    )
    return {
        "success": True,
        "data": {
            "streamId": stream_id,
            "votes": [r.to_dict() for r in rows],
        },
    }
