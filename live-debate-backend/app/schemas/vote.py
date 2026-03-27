"""
投票相关 Pydantic Schema
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class VoteRequest(BaseModel):
    """用户投票请求（100票分配制）"""
    leftVotes: int = Field(..., ge=0, le=100, description="正方票数")
    rightVotes: int = Field(..., ge=0, le=100, description="反方票数")
    streamId: str = Field(..., description="直播流ID")
    stream_id: Optional[str] = Field(None, description="直播流ID（兼容下划线格式）")
    userId: Optional[str] = Field(None, description="用户ID")
    user_id: Optional[str] = Field(None, description="用户ID（兼容下划线格式）")

    @field_validator('leftVotes', 'rightVotes')
    @classmethod
    def validate_votes(cls, v):
        if v < 0 or v > 100:
            raise ValueError('票数必须在 0-100 之间')
        return v

    def get_stream_id(self) -> str:
        return self.streamId or self.stream_id or ''

    def get_user_id(self) -> str:
        return self.userId or self.user_id or 'guest'


class VoteRequestWrapper(BaseModel):
    """包装格式投票请求（兼容前端 { request: {...} } 格式）"""
    request: VoteRequest


class VoteData(BaseModel):
    """投票数据响应"""
    stream_id: Optional[str] = None
    leftVotes: int
    rightVotes: int
    totalVotes: int
    leftPercentage: int
    rightPercentage: int


class VoteResponse(BaseModel):
    """投票响应"""
    success: bool = True
    data: VoteData
    message: str = "投票成功"


class VoteStatsResponse(BaseModel):
    """投票统计响应"""
    success: bool = True
    data: dict


class UserVoteStatusResponse(BaseModel):
    """用户投票状态响应"""
    success: bool = True
    data: dict
