"""
评论互动 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..services.comment_service import CommentService

router = APIRouter()
comment_service = CommentService()


# ==================== 前端评论接口 ====================

@router.post("/comment")
async def create_comment(
    request: Request,
    db: Session = Depends(get_db),
):
    """发表评论 - POST /api/comment"""
    body = await request.json()
    comment = comment_service.create_comment(
        db,
        ai_content_id=body.get("aiContentId") or body.get("ai_content_id") or "",
        content=body.get("content", ""),
        user_id=body.get("userId") or body.get("user_id") or "guest",
        user_name=body.get("userName") or body.get("user_name"),
    )
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="内容不存在")
    return {"success": True, "data": comment.to_dict(), "message": "评论已发表"}


@router.delete("/comment/{comment_id}")
async def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
):
    """删除评论 - DELETE /api/comment/{comment_id}"""
    if not comment_service.delete_comment(db, comment_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评论不存在")
    return {"success": True, "message": "评论已删除"}


@router.post("/comment/{comment_id}/like")
async def like_comment(
    comment_id: str,
    db: Session = Depends(get_db),
):
    """点赞评论 - POST /api/comment/{comment_id}/like"""
    comment = comment_service.like_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评论不存在")
    return {"success": True, "data": {"likeCount": comment.like_count}, "message": "点赞成功"}


@router.post("/comment/{comment_id}/unlike")
async def unlike_comment(
    comment_id: str,
    db: Session = Depends(get_db),
):
    """取消点赞评论 - POST /api/comment/{comment_id}/unlike"""
    comment = comment_service.unlike_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评论不存在")
    return {"success": True, "data": {"likeCount": comment.like_count}, "message": "已取消点赞"}


@router.get("/user/{user_id}/comments")
async def get_user_comments(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取用户评论列表 - GET /api/user/{user_id}/comments"""
    comments, total = comment_service.get_user_comments(db, user_id, skip=skip, limit=limit)
    return {
        "success": True,
        "data": {
            "comments": [c.to_dict() for c in comments],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }


# ==================== 管理员评论接口 ====================

@router.get("/admin/comments")
async def admin_list_comments(
    ai_content_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取评论列表（管理端） - GET /api/admin/comments"""
    if ai_content_id:
        comments, total = comment_service.list_comments(
            db, ai_content_id, skip=skip, limit=limit
        )
    else:
        # 获取所有评论
        from ..models.ai_content import Comment
        query = db.query(Comment).filter(Comment.status == "published")
        total = query.count()
        comments = query.order_by(Comment.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "data": {
            "comments": [c.to_dict() for c in comments],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }


@router.post("/admin/comments/{comment_id}/hide")
async def hide_comment(
    comment_id: str,
    db: Session = Depends(get_db),
):
    """隐藏评论（管理员） - POST /api/admin/comments/{comment_id}/hide"""
    comment = comment_service.hide_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评论不存在")
    return {"success": True, "data": comment.to_dict(), "message": "评论已隐藏"}


@router.delete("/admin/comments/{comment_id}")
async def admin_delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
):
    """删除评论（管理员） - DELETE /api/admin/comments/{comment_id}"""
    if not comment_service.delete_comment(db, comment_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评论不存在")
    return {"success": True, "message": "评论已删除"}


@router.get("/admin/comments/{comment_id}/statistics")
async def get_comment_statistics(
    comment_id: str,
    db: Session = Depends(get_db),
):
    """获取评论统计 - GET /api/admin/comments/{comment_id}/statistics"""
    stats = comment_service.get_comment_statistics(db, comment_id)
    if not stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评论不存在")
    return {"success": True, "data": stats}
