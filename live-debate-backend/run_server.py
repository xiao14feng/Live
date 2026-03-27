import uvicorn
import os
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    """启动开发服务器"""
    print("启动直播辩论后端API服务...")
    print("项目目录:", project_root)
    print("访问地址: http://localhost:8000")
    print("API文档: http://localhost:8000/docs")
    print("热重载: 已启用")
    print("=" * 50)

    # 检查环境文件
    env_file = project_root / ".env"
    if not env_file.exists():
        print("未找到 .env 文件，将使用默认配置")
        print("建议复制 .env.example 为 .env 并修改配置")
        print()

    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n服务器已停止")
    except Exception as e:
        print(f"启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
