"""
评论互动业务逻辑服务
"""
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from ..models.ai_content import Comment


class CommentService:
    """评论服务"""

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
        from ..models.ai_content import AIContent
        
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
        ai_content.comment_count += 1
        db.commit()
        db.refresh(comment)
        return comment

    def get_comment(self, db: Session, comment_id: str) -> Optional[Comment]:
        """获取评论详情"""
        return db.query(Comment).filter(Comment.id == comment_id).first()

    def list_comments(
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
        comment = self.get_comment(db, comment_id)
        if not comment:
            return False

        from ..models.ai_content import AIContent
        
        ai_content = db.query(AIContent).filter(AIContent.id == comment.ai_content_id).first()
        if ai_content and ai_content.comment_count > 0:
            ai_content.comment_count -= 1

        db.delete(comment)
        db.commit()
        return True

    def hide_comment(self, db: Session, comment_id: str) -> Optional[Comment]:
        """隐藏评论（管理员）"""
        comment = self.get_comment(db, comment_id)
        if not comment:
            return None
        comment.status = "hidden"
        db.commit()
        db.refresh(comment)
        return comment

    # ────────────────── 点赞 ──────────────────

    def like_comment(self, db: Session, comment_id: str) -> Optional[Comment]:
        """点赞评论"""
        comment = self.get_comment(db, comment_id)
        if not comment:
            return None
        comment.like_count += 1
        db.commit()
        db.refresh(comment)
        return comment

    def unlike_comment(self, db: Session, comment_id: str) -> Optional[Comment]:
        """取消点赞评论"""
        comment = self.get_comment(db, comment_id)
        if not comment:
            return None
        if comment.like_count > 0:
            comment.like_count -= 1
        db.commit()
        db.refresh(comment)
        return comment

    # ────────────────── 统计 ──────────────────

    def get_user_comments(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[Comment], int]:
        """获取用户的评论列表"""
        query = db.query(Comment).filter(
            Comment.user_id == user_id,
            Comment.status == "published",
        )
        total = query.count()
        comments = query.order_by(Comment.created_at.desc()).offset(skip).limit(limit).all()
        return comments, total

    def get_comment_statistics(self, db: Session, comment_id: str) -> dict:
        """获取评论统计"""
        comment = self.get_comment(db, comment_id)
        if not comment:
            return {}
        return {
            "commentId": comment.id,
            "content": comment.content[:100],  # 截断内容
            "userId": comment.user_id,
            "userName": comment.user_name,
            "likeCount": comment.like_count,
            "createdAt": comment.created_at.isoformat() if comment.created_at else None,
        }
