"""
用户管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from sqlalchemy import func

from ..database import get_db
from ..models.user import User

router = APIRouter()


# ==================== 管理员用户管理接口 ====================

@router.get("/admin/users")
async def admin_list_users(
    status: Optional[str] = Query(None, description="用户状态: active/inactive/banned"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取用户列表（管理端） - GET /api/admin/users"""
    query = db.query(User)
    if status:
        query = query.filter(User.status == status)
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "data": {
            "users": [u.to_dict() for u in users],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }


@router.get("/admin/users/{user_id}")
async def admin_get_user(
    user_id: str,
    db: Session = Depends(get_db),
):
    """获取用户详情（管理端） - GET /api/admin/users/{user_id}"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return {"success": True, "data": user.to_dict()}


@router.get("/admin/users/{user_id}/statistics")
async def get_user_statistics(
    user_id: str,
    db: Session = Depends(get_db),
):
    """获取用户统计信息 - GET /api/admin/users/{user_id}/statistics"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    
    # 获取用户的投票记录数
    from ..models.vote import VoteRecord
    vote_count = db.query(func.count(VoteRecord.id)).filter(
        VoteRecord.user_id == user_id
    ).scalar() or 0
    
    # 获取用户的评论数
    from ..models.ai_content import Comment
    comment_count = db.query(func.count(Comment.id)).filter(
        Comment.user_id == user_id,
        Comment.status == "published"
    ).scalar() or 0
    
    return {
        "success": True,
        "data": {
            "userId": user.id,
            "nickname": user.nickname,
            "totalVotes": user.total_votes,
            "joinedDebates": user.joined_debates,
            "voteRecordCount": vote_count,
            "commentCount": comment_count,
            "status": user.status,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
        },
    }


# ==================== 小程序用户统计接口 ====================

@router.get("/admin/miniprogram/users")
async def miniprogram_user_statistics(
    db: Session = Depends(get_db),
):
    """小程序用户统计 - GET /api/admin/miniprogram/users"""
    # 总用户数
    total_users = db.query(func.count(User.id)).scalar() or 0
    
    # 活跃用户数（有登录记录的）
    active_users = db.query(func.count(User.id)).filter(
        User.last_login_at.isnot(None)
    ).scalar() or 0
    
    # 被禁用用户数
    banned_users = db.query(func.count(User.id)).filter(
        User.status == "banned"
    ).scalar() or 0
    
    # 平均投票数
    avg_votes = db.query(func.avg(User.total_votes)).scalar() or 0
    
    # 平均参与辩论数
    avg_debates = db.query(func.avg(User.joined_debates)).scalar() or 0
    
    # 今日新增用户
    from datetime import datetime, timedelta
    today = datetime.now().date()
    today_new_users = db.query(func.count(User.id)).filter(
        func.date(User.created_at) == today
    ).scalar() or 0
    
    return {
        "success": True,
        "data": {
            "totalUsers": total_users,
            "activeUsers": active_users,
            "bannedUsers": banned_users,
            "inactiveUsers": total_users - active_users - banned_users,
            "averageVotes": round(float(avg_votes), 2),
            "averageDebates": round(float(avg_debates), 2),
            "todayNewUsers": today_new_users,
            "activeRate": round((active_users / total_users * 100) if total_users > 0 else 0, 2),
        },
    }


@router.get("/admin/miniprogram/users/daily")
async def miniprogram_daily_statistics(
    days: int = Query(7, ge=1, le=30, description="查询天数"),
    db: Session = Depends(get_db),
):
    """小程序每日用户统计 - GET /api/admin/miniprogram/users/daily"""
    from datetime import datetime, timedelta
    
    daily_stats = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).date()
        new_users = db.query(func.count(User.id)).filter(
            func.date(User.created_at) == date
        ).scalar() or 0
        
        daily_stats.append({
            "date": date.isoformat(),
            "newUsers": new_users,
        })
    
    return {
        "success": True,
        "data": {
            "dailyStats": list(reversed(daily_stats)),
            "days": days,
        },
    }


# ==================== 用户信息接口 ====================

@router.get("/user/profile")
async def get_user_profile(
    user_id: str = Query(..., description="用户ID"),
    db: Session = Depends(get_db),
):
    """获取用户个人信息 - GET /api/user/profile"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return {"success": True, "data": user.to_dict()}


@router.get("/users/search")
async def search_users(
    keyword: str = Query(..., description="搜索关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """搜索用户 - GET /api/users/search"""
    query = db.query(User).filter(
        (User.nickname.ilike(f"%{keyword}%")) | (User.openid.ilike(f"%{keyword}%"))
    )
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "data": {
            "users": [u.to_dict() for u in users],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }
