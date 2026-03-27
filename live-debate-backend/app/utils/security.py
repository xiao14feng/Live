"""
安全相关工具函数
包括JWT token生成、密码加密等
"""
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext

from ..config import settings

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    创建JWT访问令牌
    
    Args:
        data: 要编码的数据
        expires_delta: 过期时间增量
        
    Returns:
        JWT令牌字符串
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret, 
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    验证JWT令牌
    
    Args:
        token: JWT令牌字符串
        
    Returns:
        解码后的数据，验证失败返回None
    """
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret, 
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except jwt.PyJWTError:
        return None


def get_password_hash(password: str) -> str:
    """
    生成密码哈希
    
    Args:
        password: 明文密码
        
    Returns:
        密码哈希
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码
    
    Args:
        plain_password: 明文密码
        hashed_password: 密码哈希
        
    Returns:
        密码是否正确
    """
    return pwd_context.verify(plain_password, hashed_password)


def generate_api_key() -> str:
    """
    生成API密钥
    
    Returns:
        API密钥字符串
    """
    import secrets
    return secrets.token_urlsafe(32)


def mask_sensitive_data(data: str, show_chars: int = 4) -> str:
    """
    遮蔽敏感数据
    
    Args:
        data: 敏感数据
        show_chars: 显示的字符数
        
    Returns:
        遮蔽后的数据
    """
    if not data or len(data) <= show_chars:
        return data
    
    return data[:show_chars] + "*" * (len(data) - show_chars)