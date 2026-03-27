"""
数据库初始化脚本
创建表结构和初始数据
"""
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.database import engine, Base, SessionLocal
from app.models.user import User
from app.config import settings
import uuid
from datetime import datetime

def create_tables():
    """创建数据库表"""
    print("📊 创建数据库表...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ 数据库表创建成功")
        return True
    except Exception as e:
        print(f"❌ 创建数据库表失败: {e}")
        return False

def create_sample_users():
    """创建示例用户数据"""
    print("👥 创建示例用户数据...")
    
    db = SessionLocal()
    try:
        # 检查是否已有用户
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"ℹ️  数据库中已有 {existing_users} 个用户，跳过创建示例数据")
            return True
        
        # 创建示例用户
        sample_users = [
            {
                "openid": "mock_openid_admin_001",
                "nickname": "管理员",
                "avatar_url": "/static/admin-avatar.png",
                "status": "active",
                "total_votes": 0
            },
            {
                "openid": "mock_openid_user_001",
                "nickname": "测试用户1",
                "avatar_url": "/static/user1-avatar.png",
                "status": "active",
                "total_votes": 150
            },
            {
                "openid": "mock_openid_user_002",
                "nickname": "测试用户2",
                "avatar_url": "/static/user2-avatar.png",
                "status": "active",
                "total_votes": 89
            },
            {
                "openid": "mock_openid_user_003",
                "nickname": "辩论爱好者",
                "avatar_url": "/static/user3-avatar.png",
                "status": "active",
                "total_votes": 267
            }
        ]
        
        for user_data in sample_users:
            user = User(
                id=str(uuid.uuid4()),
                openid=user_data["openid"],
                nickname=user_data["nickname"],
                avatar_url=user_data["avatar_url"],
                status=user_data["status"],
                total_votes=user_data["total_votes"]
            )
            db.add(user)
        
        db.commit()
        print(f"✅ 成功创建 {len(sample_users)} 个示例用户")
        return True
        
    except Exception as e:
        print(f"❌ 创建示例用户失败: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def show_database_info():
    """显示数据库信息"""
    print("📋 数据库信息:")
    print(f"   - 类型: SQLite")
    print(f"   - 文件: {settings.database_url}")
    print(f"   - 环境: {settings.environment}")
    
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        print(f"   - 用户数量: {user_count}")
        
        if user_count > 0:
            latest_user = db.query(User).order_by(User.created_at.desc()).first()
            print(f"   - 最新用户: {latest_user.nickname} ({latest_user.created_at})")
    except Exception as e:
        print(f"   - 查询失败: {e}")
    finally:
        db.close()

def main():
    """主函数"""
    print("🔧 数据库初始化工具")
    print("=" * 50)
    
    # 检查数据库引擎
    if not engine:
        print("❌ 数据库引擎未初始化")
        return False
    
    success = True
    
    # 创建表
    if not create_tables():
        success = False
    
    print()
    
    # 创建示例数据
    if not create_sample_users():
        success = False
    
    print()
    
    # 显示数据库信息
    show_database_info()
    
    print()
    print("=" * 50)
    
    if success:
        print("🎉 数据库初始化完成！")
        print("💡 现在可以启动服务器: python run_server.py")
    else:
        print("⚠️  数据库初始化过程中出现错误")
    
    return success

if __name__ == "__main__":
    main()