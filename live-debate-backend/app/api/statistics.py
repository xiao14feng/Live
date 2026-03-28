"""
统计数据 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional

from ..database import get_db
from ..models.user import User
from ..models.vote import VoteRecord, VoteAggregate
from ..models.stream import Stream
from ..models.ai_content import AIContent, Comment

router = APIRouter()


# ==================== 仪表板接口 ====================

@router.get("/admin/dashboard")
async def get_dashboard(
    db: Session = Depends(get_db),
):
    """获取仪表板数据 - GET /api/admin/dashboard"""
    # 用户统计
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(
        User.last_login_at.isnot(None)
    ).scalar() or 0
    
    # 直播统计
    total_streams = db.query(func.count(Stream.id)).scalar() or 0
    live_streams = db.query(func.count(Stream.id)).filter(
        Stream.status == "live"
    ).scalar() or 0
    
    # 投票统计
    total_votes = db.query(func.sum(VoteAggregate.left_votes + VoteAggregate.right_votes)).scalar() or 0
    
    # AI内容统计
    total_contents = db.query(func.count(AIContent.id)).scalar() or 0
    total_comments = db.query(func.count(Comment.id)).filter(
        Comment.status == "published"
    ).scalar() or 0
    
    # 今日数据
    today = datetime.now().date()
    today_new_users = db.query(func.count(User.id)).filter(
        func.date(User.created_at) == today
    ).scalar() or 0
    today_new_streams = db.query(func.count(Stream.id)).filter(
        func.date(Stream.created_at) == today
    ).scalar() or 0
    
    return {
        "success": True,
        "data": {
            "users": {
                "total": total_users,
                "active": active_users,
                "todayNew": today_new_users,
            },
            "streams": {
                "total": total_streams,
                "live": live_streams,
                "todayNew": today_new_streams,
            },
            "votes": {
                "total": int(total_votes),
            },
            "content": {
                "total": total_contents,
                "comments": total_comments,
            },
            "timestamp": datetime.now().isoformat(),
        },
    }


# ==================== 统计摘要接口 ====================

@router.get("/admin/statistics/summary")
async def get_statistics_summary(
    db: Session = Depends(get_db),
):
    """获取统计摘要 - GET /api/admin/statistics/summary"""
    # 用户相关
    total_users = db.query(func.count(User.id)).scalar() or 0
    avg_votes_per_user = db.query(func.avg(User.total_votes)).scalar() or 0
    avg_debates_per_user = db.query(func.avg(User.joined_debates)).scalar() or 0
    
    # 直播相关
    total_streams = db.query(func.count(Stream.id)).scalar() or 0
    total_viewers = db.query(func.sum(Stream.peak_viewer_count)).scalar() or 0
    
    # 投票相关
    total_votes = db.query(func.sum(VoteAggregate.left_votes + VoteAggregate.right_votes)).scalar() or 0
    
    # 内容相关
    total_contents = db.query(func.count(AIContent.id)).scalar() or 0
    total_likes = db.query(func.sum(AIContent.like_count)).scalar() or 0
    total_comments = db.query(func.count(Comment.id)).filter(
        Comment.status == "published"
    ).scalar() or 0
    
    return {
        "success": True,
        "data": {
            "users": {
                "total": total_users,
                "averageVotes": round(float(avg_votes_per_user), 2),
                "averageDebates": round(float(avg_debates_per_user), 2),
            },
            "streams": {
                "total": total_streams,
                "totalViewers": int(total_viewers),
            },
            "votes": {
                "total": int(total_votes),
            },
            "content": {
                "total": total_contents,
                "totalLikes": int(total_likes),
                "totalComments": total_comments,
            },
        },
    }


# ==================== 每日统计接口 ====================

@router.get("/admin/statistics/daily")
async def get_daily_statistics(
    days: int = Query(7, ge=1, le=30, description="查询天数"),
    db: Session = Depends(get_db),
):
    """获取每日统计 - GET /api/admin/statistics/daily"""
    daily_stats = []
    
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).date()
        
        # 每日新增用户
        new_users = db.query(func.count(User.id)).filter(
            func.date(User.created_at) == date
        ).scalar() or 0
        
        # 每日新增直播
        new_streams = db.query(func.count(Stream.id)).filter(
            func.date(Stream.created_at) == date
        ).scalar() or 0
        
        # 每日投票总数
        daily_votes = db.query(func.sum(VoteRecord.left_votes + VoteRecord.right_votes)).filter(
            func.date(VoteRecord.created_at) == date
        ).scalar() or 0
        
        # 每日新增评论
        new_comments = db.query(func.count(Comment.id)).filter(
            func.date(Comment.created_at) == date,
            Comment.status == "published"
        ).scalar() or 0
        
        daily_stats.append({
            "date": date.isoformat(),
            "newUsers": new_users,
            "newStreams": new_streams,
            "totalVotes": int(daily_votes),
            "newComments": new_comments,
        })
    
    return {
        "success": True,
        "data": {
            "dailyStats": list(reversed(daily_stats)),
            "days": days,
        },
    }


# ==================== 投票统计接口 ====================

@router.get("/admin/statistics/votes")
async def get_votes_statistics(
    stream_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """获取投票统计 - GET /api/admin/statistics/votes"""
    if stream_id:
        agg = db.query(VoteAggregate).filter(VoteAggregate.stream_id == stream_id).first()
        if not agg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="直播流不存在")
        
        total = agg.left_votes + agg.right_votes
        return {
            "success": True,
            "data": {
                "streamId": stream_id,
                "leftVotes": agg.left_votes,
                "rightVotes": agg.right_votes,
                "totalVotes": total,
                "leftPercentage": round((agg.left_votes / total * 100) if total > 0 else 50, 2),
                "rightPercentage": round((agg.right_votes / total * 100) if total > 0 else 50, 2),
            },
        }
    else:
        # 全局投票统计
        total_left = db.query(func.sum(VoteAggregate.left_votes)).scalar() or 0
        total_right = db.query(func.sum(VoteAggregate.right_votes)).scalar() or 0
        total = total_left + total_right
        
        return {
            "success": True,
            "data": {
                "leftVotes": int(total_left),
                "rightVotes": int(total_right),
                "totalVotes": int(total),
                "leftPercentage": round((total_left / total * 100) if total > 0 else 50, 2),
                "rightPercentage": round((total_right / total * 100) if total > 0 else 50, 2),
            },
        }


# ==================== 内容统计接口 ====================

@router.get("/admin/statistics/content")
async def get_content_statistics(
    db: Session = Depends(get_db),
):
    """获取内容统计 - GET /api/admin/statistics/content"""
    total_contents = db.query(func.count(AIContent.id)).scalar() or 0
    total_views = db.query(func.sum(AIContent.view_count)).scalar() or 0
    total_likes = db.query(func.sum(AIContent.like_count)).scalar() or 0
    total_comments = db.query(func.count(Comment.id)).filter(
        Comment.status == "published"
    ).scalar() or 0
    
    # 热门内容（点赞最多）
    top_contents = db.query(AIContent).order_by(
        AIContent.like_count.desc()
    ).limit(5).all()
    
    return {
        "success": True,
        "data": {
            "totalContents": total_contents,
            "totalViews": int(total_views),
            "totalLikes": int(total_likes),
            "totalComments": total_comments,
            "averageViewsPerContent": round((total_views / total_contents) if total_contents > 0 else 0, 2),
            "topContents": [
                {
                    "id": c.id,
                    "title": c.title,
                    "views": c.view_count,
                    "likes": c.like_count,
                    "comments": c.comment_count,
                }
                for c in top_contents
            ],
        },
    }


# ==================== 直播统计接口 ====================

@router.get("/admin/statistics/streams")
async def get_streams_statistics(
    db: Session = Depends(get_db),
):
    """获取直播统计 - GET /api/admin/statistics/streams"""
    total_streams = db.query(func.count(Stream.id)).scalar() or 0
    total_viewers = db.query(func.sum(Stream.peak_viewer_count)).scalar() or 0
    avg_viewers = db.query(func.avg(Stream.peak_viewer_count)).scalar() or 0
    
    # 直播状态分布
    pending = db.query(func.count(Stream.id)).filter(Stream.status == "pending").scalar() or 0
    live = db.query(func.count(Stream.id)).filter(Stream.status == "live").scalar() or 0
    ended = db.query(func.count(Stream.id)).filter(Stream.status == "ended").scalar() or 0
    
    return {
        "success": True,
        "data": {
            "totalStreams": total_streams,
            "totalViewers": int(total_viewers),
            "averageViewersPerStream": round(float(avg_viewers), 2),
            "statusDistribution": {
                "pending": pending,
                "live": live,
                "ended": ended,
            },
        },
    }
