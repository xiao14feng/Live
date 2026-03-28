"""
AI内容管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..services.ai_service import AIService
from ..models.ai_content import AIContent

router = APIRouter()
ai_service = AIService()


# ==================== 前端AI内容接口 ====================

@router.get("/ai-content")
async def get_ai_contents(
    stream_id: Optional[str] = Query(None, description="直播流ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取AI内容列表 - GET /api/ai-content"""
    contents, total = ai_service.list_contents(
        db, stream_id=stream_id, status="published", skip=skip, limit=limit
    )
    return {
        "success": True,
        "data": {
            "contents": [c.to_dict() for c in contents],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }


@router.get("/ai-content/{content_id}")
async def get_ai_content(
    content_id: str,
    db: Session = Depends(get_db),
):
    """获取AI内容详情 - GET /api/ai-content/{content_id}"""
    content = ai_service.get_content(db, content_id)
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="内容不存在")
    return {"success": True, "data": content.to_dict()}


@router.post("/ai-content/{content_id}/like")
async def like_ai_content(
    content_id: str,
    db: Session = Depends(get_db),
):
    """点赞AI内容 - POST /api/ai-content/{content_id}/like"""
    content = ai_service.like_content(db, content_id)
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="内容不存在")
    return {"success": True, "data": {"likeCount": content.like_count}, "message": "点赞成功"}


# ==================== 评论接口 ====================

@router.get("/ai-content/{content_id}/comments")
async def get_comments(
    content_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取评论列表 - GET /api/ai-content/{content_id}/comments"""
    comments, total = ai_service.get_comments(db, content_id, skip=skip, limit=limit)
    return {
        "success": True,
        "data": {
            "comments": [c.to_dict() for c in comments],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }


@router.post("/ai-content/{content_id}/comments")
async def create_comment(
    content_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """发表评论 - POST /api/ai-content/{content_id}/comments"""
    body = await request.json()
    comment = ai_service.create_comment(
        db,
        content_id,
        content=body.get("content", ""),
        user_id=body.get("userId") or body.get("user_id") or "guest",
        user_name=body.get("userName") or body.get("user_name"),
    )
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="内容不存在")
    return {"success": True, "data": comment.to_dict(), "message": "评论已发表"}


@router.delete("/ai-content/{content_id}/comments/{comment_id}")
async def delete_comment(
    content_id: str,
    comment_id: str,
    db: Session = Depends(get_db),
):
    """删除评论 - DELETE /api/ai-content/{content_id}/comments/{comment_id}"""
    if not ai_service.delete_comment(db, comment_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评论不存在")
    return {"success": True, "message": "评论已删除"}


@router.post("/ai-content/{content_id}/comments/{comment_id}/like")
async def like_comment(
    content_id: str,
    comment_id: str,
    db: Session = Depends(get_db),
):
    """点赞评论 - POST /api/ai-content/{content_id}/comments/{comment_id}/like"""
    comment = ai_service.like_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评论不存在")
    return {"success": True, "data": {"likeCount": comment.like_count}, "message": "点赞成功"}


# ==================== 管理员AI内容接口 ====================

@router.post("/admin/ai-content")
async def create_ai_content(
    request: Request,
    db: Session = Depends(get_db),
):
    """创建AI内容 - POST /api/admin/ai-content"""
    body = await request.json()
    content = ai_service.create_content(
        db,
        title=body.get("title", "未命名内容"),
        content=body.get("content", ""),
        summary=body.get("summary"),
        stream_id=body.get("streamId") or body.get("stream_id"),
        debate_id=body.get("debateId") or body.get("debate_id"),
        creator_id=body.get("creatorId") or body.get("creator_id"),
    )
    return {"success": True, "data": content.to_dict(), "message": "内容已创建"}


@router.get("/admin/ai-content/list")
async def admin_list_ai_contents(
    stream_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取AI内容列表（管理端） - GET /api/admin/ai-content/list"""
    contents, total = ai_service.list_contents(
        db, stream_id=stream_id, status=status, skip=skip, limit=limit
    )
    return {
        "success": True,
        "data": {
            "contents": [c.to_dict() for c in contents],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }


@router.get("/admin/ai-content/{content_id}")
async def admin_get_ai_content(
    content_id: str,
    db: Session = Depends(get_db),
):
    """获取AI内容详情（管理端） - GET /api/admin/ai-content/{content_id}"""
    content = db.query(AIContent).filter(AIContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="内容不存在")
    return {"success": True, "data": content.to_dict()}


@router.put("/admin/ai-content/{content_id}")
async def update_ai_content(
    content_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """更新AI内容 - PUT /api/admin/ai-content/{content_id}"""
    body = await request.json()
    content = ai_service.update_content(
        db,
        content_id,
        title=body.get("title"),
        content=body.get("content"),
        summary=body.get("summary"),
    )
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="内容不存在")
    return {"success": True, "data": content.to_dict(), "message": "内容已更新"}


@router.delete("/admin/ai-content/{content_id}")
async def delete_ai_content(
    content_id: str,
    db: Session = Depends(get_db),
):
    """删除AI内容 - DELETE /api/admin/ai-content/{content_id}"""
    if not ai_service.delete_content(db, content_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="内容不存在")
    return {"success": True, "message": "内容已删除"}


@router.get("/admin/ai-content/{content_id}/statistics")
async def get_ai_content_statistics(
    content_id: str,
    db: Session = Depends(get_db),
):
    """获取AI内容统计 - GET /api/admin/ai-content/{content_id}/statistics"""
    stats = ai_service.get_content_statistics(db, content_id)
    if not stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="内容不存在")
    return {"success": True, "data": stats}


# ==================== 管理员评论接口 ====================

@router.get("/admin/ai-content/{content_id}/comments")
async def admin_get_comments(
    content_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取评论列表（管理端） - GET /api/admin/ai-content/{content_id}/comments"""
    comments, total = ai_service.get_comments(db, content_id, skip=skip, limit=limit)
    return {
        "success": True,
        "data": {
            "comments": [c.to_dict() for c in comments],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }


@router.delete("/admin/ai-content/{content_id}/comments/{comment_id}")
async def admin_delete_comment(
    content_id: str,
    comment_id: str,
    db: Session = Depends(get_db),
):
    """删除评论（管理端） - DELETE /api/admin/ai-content/{content_id}/comments/{comment_id}"""
    if not ai_service.delete_comment(db, comment_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评论不存在")
    return {"success": True, "message": "评论已删除"}
