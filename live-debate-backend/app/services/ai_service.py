"""
AI内容业务逻辑服务
"""
import asyncio
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from ..models.ai_content import AIContent, Comment


class AIService:
    """AI内容服务"""

    # ────────────────── AI内容CRUD ──────────────────

    def create_content(
        self,
        db: Session,
        title: str,
        content: str,
        summary: Optional[str] = None,
        stream_id: Optional[str] = None,
        debate_id: Optional[str] = None,
        creator_id: Optional[str] = None,
    ) -> AIContent:
        """创建AI内容"""
        ai_content = AIContent(
            title=title,
            content=content,
            summary=summary,
            stream_id=stream_id,
            debate_id=debate_id,
            creator_id=creator_id,
            status="published",
        )
        db.add(ai_content)
        db.commit()
        db.refresh(ai_content)
        return ai_content

    def get_content(self, db: Session, content_id: str) -> Optional[AIContent]:
        """获取AI内容详情"""
        content = db.query(AIContent).filter(AIContent.id == content_id).first()
        if content:
            # 增加浏览次数
            content.view_count += 1
            db.commit()
        return content

    def list_contents(
        self,
        db: Session,
        stream_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[AIContent], int]:
        """获取AI内容列表"""
        query = db.query(AIContent)
        if stream_id:
            query = query.filter(AIContent.stream_id == stream_id)
        if status:
            query = query.filter(AIContent.status == status)
        total = query.count()
        contents = query.order_by(AIContent.created_at.desc()).offset(skip).limit(limit).all()
        return contents, total

    def update_content(
        self,
        db: Session,
        content_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        summary: Optional[str] = None,
    ) -> Optional[AIContent]:
        """更新AI内容"""
        ai_content = self.get_content(db, content_id)
        if not ai_content:
            return None
        if title is not None:
            ai_content.title = title
        if content is not None:
            ai_content.content = content
        if summary is not None:
            ai_content.summary = summary
        db.commit()
        db.refresh(ai_content)
        return ai_content

    def delete_content(self, db: Session, content_id: str) -> bool:
        """删除AI内容"""
        ai_content = self.get_content(db, content_id)
        if not ai_content:
            return False
        db.delete(ai_content)
        # 删除关联评论
        db.query(Comment).filter(Comment.ai_content_id == content_id).delete()
        db.commit()
        return True

    # ────────────────── 点赞 ──────────────────

    def like_content(self, db: Session, content_id: str) -> Optional[AIContent]:
        """点赞AI内容"""
        ai_content = db.query(AIContent).filter(AIContent.id == content_id).first()
        if not ai_content:
            return None
        ai_content.like_count += 1
        db.commit()
        db.refresh(ai_content)
        return ai_content

    # ────────────────── 评论CRUD ──────────────────

    def create_comment(
        self,
        db: Session,
        ai_content_id: str,
        content: str,
        user_id: str,
        user_name: Optional[str] = None,
    ) -> Optional[Comment]:
        """创建评论"""
        ai_content = db.query(AIContent).filter(AIContent.id == ai_content_id).first()
        if not ai_content:
            return None

        comment = Comment(
            content=content,
            ai_content_id=ai_content_id,
            user_id=user_id,
            user_name=user_name,
            status="published",
        )
        db.add(comment)
        # 更新内容的评论计数
        ai_content.comment_count += 1
        db.commit()
        db.refresh(comment)
        return comment

    def get_comments(
        self,
        db: Session,
        ai_content_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[Comment], int]:
        """获取评论列表"""
        query = db.query(Comment).filter(
            Comment.ai_content_id == ai_content_id,
            Comment.status == "published",
        )
        total = query.count()
        comments = query.order_by(Comment.created_at.desc()).offset(skip).limit(limit).all()
        return comments, total

    def delete_comment(self, db: Session, comment_id: str) -> bool:
        """删除评论"""
        comment = db.query(Comment).filter(Comment.id == comment_id).first()
        if not comment:
            return False

        # 更新内容的评论计数
        ai_content = db.query(AIContent).filter(AIContent.id == comment.ai_content_id).first()
        if ai_content and ai_content.comment_count > 0:
            ai_content.comment_count -= 1

        db.delete(comment)
        db.commit()
        return True

    def like_comment(self, db: Session, comment_id: str) -> Optional[Comment]:
        """点赞评论"""
        comment = db.query(Comment).filter(Comment.id == comment_id).first()
        if not comment:
            return None
        comment.like_count += 1
        db.commit()
        db.refresh(comment)
        return comment

    # ────────────────── 统计 ──────────────────

    def get_content_statistics(self, db: Session, content_id: str) -> dict:
        """获取内容统计"""
        ai_content = db.query(AIContent).filter(AIContent.id == content_id).first()
        if not ai_content:
            return {}
        return {
            "contentId": ai_content.id,
            "title": ai_content.title,
            "viewCount": ai_content.view_count,
            "likeCount": ai_content.like_count,
            "commentCount": ai_content.comment_count,
        }
