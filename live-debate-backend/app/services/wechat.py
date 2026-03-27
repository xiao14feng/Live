"""
微信服务类
处理微信登录、用户信息获取等功能
"""
import httpx
import json
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from ..config import settings
from ..models.user import User
from ..schemas.user import WechatUserInfo
from ..utils.security import create_access_token


class WechatService:
    """微信服务类"""
    
    def __init__(self):
        self.appid = settings.wechat_appid
        self.secret = settings.wechat_secret
        self.use_mock = settings.wechat_use_mock
        self.api_base = "https://api.weixin.qq.com"
    
    async def get_openid(self, code: str) -> Dict[str, Any]:
        """
        通过code获取openid和session_key
        
        Args:
            code: 微信登录code
            
        Returns:
            包含openid和session_key的字典
            
        Raises:
            Exception: 微信API调用失败
        """
        if self.use_mock:
            # 模拟模式，返回mock数据
            return self._get_mock_wechat_data(code)
        
        # 真实微信API调用
        return await self._call_wechat_api(code)
    
    def _get_mock_wechat_data(self, code: str) -> Dict[str, Any]:
        """生成mock微信数据"""
        timestamp = int(datetime.now().timestamp())
        return {
            "openid": f"mock_openid_{timestamp}",
            "session_key": f"mock_session_key_{uuid.uuid4().hex[:16]}",
            "unionid": None,  # mock模式不返回unionid
            "expires_in": 7200
        }
    
    async def _call_wechat_api(self, code: str) -> Dict[str, Any]:
        """调用真实微信API"""
        url = f"{self.api_base}/sns/jscode2session"
        params = {
            "appid": self.appid,
            "secret": self.secret,
            "js_code": code,
            "grant_type": "authorization_code"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                
                data = response.json()
                
                # 检查微信API错误
                if "errcode" in data:
                    error_msg = self._get_wechat_error_message(data["errcode"], data.get("errmsg", ""))
                    raise Exception(f"微信API错误: {error_msg}")
                
                return data
                
        except httpx.TimeoutException:
            raise Exception("微信API调用超时")
        except httpx.HTTPError as e:
            raise Exception(f"微信API网络错误: {str(e)}")
        except Exception as e:
            if "微信API错误" in str(e):
                raise
            raise Exception(f"微信API调用失败: {str(e)}")
    
    def _get_wechat_error_message(self, errcode: int, errmsg: str) -> str:
        """获取微信错误信息"""
        error_messages = {
            40029: "code无效或已过期",
            40163: "code已被使用",
            45011: "API调用太频繁",
            40013: "AppID无效",
            40125: "AppSecret无效"
        }
        
        return error_messages.get(errcode, f"{errmsg} (错误码: {errcode})")
    
    def create_or_update_user(
        self, 
        db: Session, 
        openid: str, 
        session_key: str,
        unionid: Optional[str] = None,
        user_info: Optional[WechatUserInfo] = None
    ) -> User:
        """
        创建或更新用户信息
        
        Args:
            db: 数据库会话
            openid: 微信openid
            session_key: 微信session_key
            unionid: 微信unionid (可选)
            user_info: 用户信息 (可选)
            
        Returns:
            用户对象
        """
        # 查找现有用户
        user = db.query(User).filter(User.openid == openid).first()
        
        if user:
            # 更新现有用户
            user.update_login_time()
            if unionid:
                user.unionid = unionid
            if user_info:
                user.nickname = user_info.nickName
                user.avatar_url = user_info.avatarUrl
        else:
            # 创建新用户
            user = User(
                openid=openid,
                unionid=unionid,
                nickname=user_info.nickName if user_info else "微信用户",
                avatar_url=user_info.avatarUrl if user_info else "/static/logo.png",
                status="active"
            )
            user.update_login_time()
            db.add(user)
        
        db.commit()
        db.refresh(user)
        return user
    
    def generate_login_response(
        self, 
        user: User, 
        wechat_data: Dict[str, Any],
        user_info: Optional[WechatUserInfo] = None
    ) -> Dict[str, Any]:
        """
        生成登录响应数据
        
        Args:
            user: 用户对象
            wechat_data: 微信API返回数据
            user_info: 用户信息 (可选)
            
        Returns:
            登录响应数据
        """
        # 生成JWT token
        token = create_access_token(data={"sub": user.openid, "user_id": user.id})
        
        return {
            "openid": user.openid,
            "session_key": wechat_data.get("session_key"),
            "unionid": wechat_data.get("unionid"),
            "userInfo": {
                "nickName": user.nickname,
                "avatarUrl": user.avatar_url
            } if user.nickname else (user_info.dict() if user_info else None),
            "loginTime": datetime.now().isoformat(),
            "isMock": self.use_mock,
            "token": token,
            "user": user.to_dict()
        }
    
    async def validate_session(self, openid: str, session_key: str) -> bool:
        """
        验证微信会话是否有效
        
        Args:
            openid: 微信openid
            session_key: 微信session_key
            
        Returns:
            会话是否有效
        """
        if self.use_mock:
            # mock模式总是返回有效
            return True
        
        # 真实环境下，可以通过解密用户数据来验证session_key
        # 这里简化处理，实际项目中需要实现具体的验证逻辑
        return True
    
    def decrypt_user_data(
        self, 
        encrypted_data: str, 
        iv: str, 
        session_key: str
    ) -> Optional[Dict[str, Any]]:
        """
        解密微信用户数据
        
        Args:
            encrypted_data: 加密数据
            iv: 初始向量
            session_key: 会话密钥
            
        Returns:
            解密后的用户数据
        """
        if self.use_mock:
            # mock模式返回模拟数据
            return {
                "nickName": "Mock用户",
                "avatarUrl": "/static/logo.png",
                "gender": 1,
                "country": "中国",
                "province": "广东",
                "city": "深圳"
            }
        
        # 真实环境下需要实现AES解密
        # 这里需要使用cryptography库进行AES-128-CBC解密
        # 具体实现略，需要根据微信官方文档实现
        return None