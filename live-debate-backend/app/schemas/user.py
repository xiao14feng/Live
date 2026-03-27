"""
用户相关的Pydantic模型
用于API请求和响应的数据验证
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class WechatUserInfo(BaseModel):
    """微信用户信息"""
    nickName: str = Field(..., description="用户昵称")
    avatarUrl: str = Field(..., description="用户头像URL")
    gender: Optional[int] = Field(None, description="用户性别")
    country: Optional[str] = Field(None, description="用户国家")
    province: Optional[str] = Field(None, description="用户省份")
    city: Optional[str] = Field(None, description="用户城市")
    language: Optional[str] = Field(None, description="用户语言")


class WechatLoginRequest(BaseModel):
    """微信登录请求"""
    code: str = Field(..., description="微信登录code", min_length=1)
    userInfo: Optional[WechatUserInfo] = Field(None, description="用户信息")
    encryptedData: Optional[str] = Field(None, description="加密数据")
    iv: Optional[str] = Field(None, description="初始向量")

    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        if not v or not v.strip():
            raise ValueError('微信登录code不能为空')
        return v.strip()


class UserResponse(BaseModel):
    """用户响应模型"""
    id: str
    openid: str
    unionid: Optional[str] = None
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    total_votes: int = 0
    joined_debates: int = 0
    status: str = "active"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None


class WechatLoginResponse(BaseModel):
    """微信登录响应"""
    success: bool = True
    data: dict = Field(..., description="登录数据")
    message: str = Field(default="登录成功", description="响应消息")

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "data": {
                    "openid": "mock_openid_1234567890",
                    "session_key": "mock_session_key_abcdef",
                    "unionid": None,
                    "userInfo": {
                        "nickName": "微信用户",
                        "avatarUrl": "/static/logo.png"
                    },
                    "loginTime": "2024-01-01T12:00:00.000Z",
                    "isMock": True,
                    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
                },
                "message": "登录成功"
            }
        }
    }


class UserListResponse(BaseModel):
    """用户列表响应"""
    success: bool = True
    data: list[UserResponse] = Field(..., description="用户列表")
    total: int = Field(..., description="总数量")
    page: int = Field(default=1, description="当前页码")
    page_size: int = Field(default=20, description="每页数量")


class UserStatsResponse(BaseModel):
    """用户统计响应"""
    success: bool = True
    data: dict = Field(..., description="统计数据")

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "data": {
                    "total_users": 1250,
                    "active_users": 1180,
                    "new_users_today": 25,
                    "total_votes": 15680,
                    "active_debates": 3
                }
            }
        }
    }


class ApiResponse(BaseModel):
    """通用API响应模型"""
    success: bool = Field(..., description="请求是否成功")
    data: Optional[dict] = Field(None, description="响应数据")
    message: str = Field(default="操作成功", description="响应消息")
    error: Optional[str] = Field(None, description="错误信息")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now, description="响应时间")

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "data": {"key": "value"},
                "message": "操作成功",
                "timestamp": "2024-01-01T12:00:00.000Z"
            }
        }
    }
