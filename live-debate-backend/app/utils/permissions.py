"""
权限检查工具
"""
from functools import wraps
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.user import User, UserRole
from ..database import get_db


def get_current_user(user_id: str, db: Session = Depends(get_db)) -> User:
    """获取当前用户（从请求头或查询参数）"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在"
        )
    if not user.is_active():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用"
        )
    return user


def require_role(*roles: str):
    """
    权限检查装饰器
    
    使用方法：
    @require_role(UserRole.ADMIN)
    @require_role(UserRole.JUDGE, UserRole.ADMIN)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, user: User = None, **kwargs):
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="未授权"
                )
            
            if user.role not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"权限不足。需要角色: {', '.join(roles)}"
                )
            
            return await func(*args, user=user, **kwargs)
        return wrapper
    return decorator


def check_role(user: User, required_roles: List[str]) -> bool:
    """检查用户是否拥有指定角色"""
    return user.role in required_roles


def check_admin(user: User) -> bool:
    """检查是否是管理员"""
    return user.is_admin()


def check_judge(user: User) -> bool:
    """检查是否是评委"""
    return user.is_judge()


def check_user(user: User) -> bool:
    """检查是否是普通用户"""
    return user.is_user()
