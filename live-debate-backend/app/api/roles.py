"""
用户角色管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models.user import User, UserRole

router = APIRouter()


class UpdateRoleRequest(BaseModel):
    """更新角色请求"""
    new_role: str


# ==================== 用户角色管理接口 ====================

@router.put("/admin/roles/{user_id}")
async def update_user_role(
    user_id: str,
    request: UpdateRoleRequest,
    current_user_id: str = Query(..., description="当前用户ID"),
    db: Session = Depends(get_db),
):
    """更新用户角色 - PUT /api/admin/roles/{user_id}"""
    
    # 检查当前用户是否是管理员
    admin_user = db.query(User).filter(User.id == current_user_id).first()
    if not admin_user or not admin_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以修改用户角色"
        )
    
    # 验证新角色是否有效
    valid_roles = [UserRole.USER, UserRole.JUDGE, UserRole.ADMIN]
    if request.new_role not in [r.value for r in valid_roles]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的角色。有效角色: {', '.join([r.value for r in valid_roles])}"
        )
    
    # 获取目标用户
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 更新角色
    old_role = user.role
    user.role = request.new_role
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "data": {
            "userId": user.id,
            "nickname": user.nickname,
            "oldRole": old_role,
            "newRole": user.role,
            "message": f"用户角色已从 {old_role} 更新为 {request.new_role}"
        }
    }


@router.get("/admin/roles/{user_id}")
async def get_user_role(
    user_id: str,
    db: Session = Depends(get_db),
):
    """获取用户角色 - GET /api/admin/roles/{user_id}"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return {
        "success": True,
        "data": {
            "userId": user.id,
            "nickname": user.nickname,
            "role": user.role,
            "isAdmin": user.is_admin(),
            "isJudge": user.is_judge(),
            "isUser": user.is_user(),
        }
    }


@router.get("/admin/roles/by-role/{role}")
async def get_users_by_role(
    role: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """按角色获取用户列表 - GET /api/admin/roles/by-role/{role}"""
    
    # 验证角色
    valid_roles = [UserRole.USER, UserRole.JUDGE, UserRole.ADMIN]
    if role not in [r.value for r in valid_roles]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的角色。有效角色: {', '.join([r.value for r in valid_roles])}"
        )
    
    # 查询用户
    query = db.query(User).filter(User.role == role)
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "data": {
            "role": role,
            "users": [u.to_dict() for u in users],
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    }


@router.get("/admin/roles/statistics/summary")
async def get_users_statistics_by_role(
    db: Session = Depends(get_db),
):
    """获取按角色分类的用户统计 - GET /api/admin/roles/statistics/summary"""
    from sqlalchemy import func
    
    # 统计各角色用户数
    role_stats = db.query(
        User.role,
        func.count(User.id).label("count")
    ).group_by(User.role).all()
    
    stats = {}
    total = 0
    for role, count in role_stats:
        stats[role] = count
        total += count
    
    return {
        "success": True,
        "data": {
            "total": total,
            "byRole": {
                "user": stats.get(UserRole.USER, 0),
                "judge": stats.get(UserRole.JUDGE, 0),
                "admin": stats.get(UserRole.ADMIN, 0),
            },
            "percentage": {
                "user": round((stats.get(UserRole.USER, 0) / total * 100) if total > 0 else 0, 2),
                "judge": round((stats.get(UserRole.JUDGE, 0) / total * 100) if total > 0 else 0, 2),
                "admin": round((stats.get(UserRole.ADMIN, 0) / total * 100) if total > 0 else 0, 2),
            }
        }
    }
