"""
用户认证API路由
处理微信登录、用户管理等功能
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db, CloudflareDatabase
from ..schemas.user import (
    WechatLoginRequest, 
    WechatLoginResponse, 
    UserResponse,
    UserListResponse,
    UserStatsResponse,
    ApiResponse
)
from ..services.wechat import WechatService
from ..models.user import User
from ..config import is_cloudflare_env

router = APIRouter()


@router.post("/wechat-login", response_model=WechatLoginResponse)
async def wechat_login(
    request: WechatLoginRequest,
    db: Session = Depends(get_db) if not is_cloudflare_env() else None
):
    """
    微信登录接口
    
    支持真实微信API和mock模式
    兼容现有前端调用格式
    """
    try:
        wechat_service = WechatService()
        
        # 调用微信API获取openid
        wechat_data = await wechat_service.get_openid(request.code)
        
        if not wechat_data.get('openid'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="微信登录失败：无法获取用户标识"
            )
        
        # 创建或更新用户
        if is_cloudflare_env():
            # Cloudflare环境 - 使用D1数据库
            # 注意：这里需要从FastAPI应用状态获取D1绑定
            # 实际实现时需要通过依赖注入获取
            user_data = {
                "openid": wechat_data['openid'],
                "unionid": wechat_data.get('unionid'),
                "nickname": request.userInfo.nickName if request.userInfo else "微信用户",
                "avatar_url": request.userInfo.avatarUrl if request.userInfo else "/static/logo.png"
            }
            # 这里需要实现Cloudflare D1的用户创建逻辑
            user_dict = user_data  # 简化处理
        else:
            # 本地环境 - 使用SQLAlchemy
            user = wechat_service.create_or_update_user(
                db=db,
                openid=wechat_data['openid'],
                session_key=wechat_data.get('session_key'),
                unionid=wechat_data.get('unionid'),
                user_info=request.userInfo
            )
            user_dict = user.to_dict()
        
        # 生成登录响应
        if is_cloudflare_env():
            # Cloudflare环境使用字典数据
            user_dict = user_data
        else:
            # 本地环境使用User对象
            user_dict = user.to_dict()
        
        response_data = wechat_service.generate_login_response(
            user=user if not is_cloudflare_env() else type('User', (), user_dict)(),
            wechat_data=wechat_data,
            user_info=request.userInfo
        )
        
        return WechatLoginResponse(
            success=True,
            data=response_data,
            message="登录成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"服务器处理微信登录时出错: {str(e)}"
        )


@router.get("/admin/users", response_model=UserListResponse)
async def get_users_list(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db) if not is_cloudflare_env() else None
):
    """
    获取用户列表 (管理员接口)
    
    Args:
        page: 页码，从1开始
        page_size: 每页数量，最大100
    """
    try:
        # 参数验证
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20
        
        if is_cloudflare_env():
            # Cloudflare环境
            # 这里需要实现D1数据库查询
            users_data = {
                "users": [],
                "total": 0,
                "page": page,
                "page_size": page_size
            }
        else:
            # 本地环境
            offset = (page - 1) * page_size
            
            # 获取总数
            total = db.query(User).count()
            
            # 获取用户列表
            users = db.query(User)\
                     .order_by(User.created_at.desc())\
                     .offset(offset)\
                     .limit(page_size)\
                     .all()
            
            users_data = {
                "users": [UserResponse(**user.to_dict()) for user in users],
                "total": total,
                "page": page,
                "page_size": page_size
            }
        
        return UserListResponse(
            success=True,
            data=users_data["users"],
            total=users_data["total"],
            page=users_data["page"],
            page_size=users_data["page_size"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取用户列表失败: {str(e)}"
        )


@router.get("/admin/users/{user_id}", response_model=ApiResponse)
async def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db) if not is_cloudflare_env() else None
):
    try:
        if is_cloudflare_env():
            user_data = None
        else:
            user = db.query(User).filter(User.id == user_id).first()
            user_data = user.to_dict() if user else None
        
        if not user_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
        
        return ApiResponse(success=True, data=user_data, message="获取用户详情成功")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"获取用户详情失败: {str(e)}")


@router.post("/admin/users")
async def create_user(request: Request, db: Session = Depends(get_db)):
    """添加用户"""
    import uuid
    body = await request.json()
    nickname = body.get("nickname", "").strip()
    role = body.get("role", "user")
    if not nickname:
        raise HTTPException(status_code=400, detail="用户名不能为空")
    user = User(
        id=str(uuid.uuid4()),
        openid=f"{role}_{str(uuid.uuid4())[:8]}",
        nickname=nickname,
        role=role,
        status="offline"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"success": True, "message": "用户添加成功", "data": user.to_dict()}


@router.put("/admin/users/{user_id}")
async def update_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """修改用户名"""
    body = await request.json()
    nickname = body.get("nickname", "").strip()
    if not nickname:
        raise HTTPException(status_code=400, detail="用户名不能为空")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.nickname = nickname
    db.commit()
    return {"success": True, "message": "用户名修改成功"}


@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """删除用户"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.delete(user)
    db.commit()
    return {"success": True, "message": "用户已删除"}


@router.get("/admin/miniprogram/users", response_model=UserStatsResponse)
async def get_miniprogram_users_stats(
    db: Session = Depends(get_db) if not is_cloudflare_env() else None
):
    """
    获取小程序用户统计 (管理员接口)
    """
    try:
        if is_cloudflare_env():
            # Cloudflare环境
            stats_data = {
                "total_users": 0,
                "active_users": 0,
                "new_users_today": 0,
                "total_votes": 0,
                "active_debates": 0
            }
        else:
            # 本地环境
            from datetime import datetime, timedelta
            
            total_users = db.query(User).count()
            active_users = db.query(User).filter(User.status == "active").count()
            
            # 今日新用户
            today = datetime.now().date()
            new_users_today = db.query(User)\
                               .filter(User.created_at >= today)\
                               .count()
            
            # 总投票数
            from sqlalchemy import func
            total_votes = db.query(func.sum(User.total_votes)).scalar() or 0
            
            stats_data = {
                "total_users": total_users,
                "active_users": active_users,
                "new_users_today": new_users_today,
                "total_votes": total_votes,
                "active_debates": 1  # 暂时固定值
            }
        
        return UserStatsResponse(
            success=True,
            data=stats_data
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取用户统计失败: {str(e)}"
        )