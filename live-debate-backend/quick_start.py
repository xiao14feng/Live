"""
快速开始脚本
一键设置开发环境
"""
import os
import sys
import subprocess
import shutil
from pathlib import Path

project_root = Path(__file__).parent

def check_python_version():
    """检查Python版本"""
    print("🐍 检查Python版本...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python版本过低: {version.major}.{version.minor}")
        print("💡 需要Python 3.8或更高版本")
        return False
    
    print(f"✅ Python版本: {version.major}.{version.minor}.{version.micro}")
    return True

def create_env_file():
    """创建环境配置文件"""
    print("📝 创建环境配置文件...")
    
    env_file = project_root / ".env"
    env_example = project_root / ".env.example"
    
    if env_file.exists():
        print("ℹ️  .env 文件已存在，跳过创建")
        return True
    
    if not env_example.exists():
        print("❌ .env.example 文件不存在")
        return False
    
    try:
        shutil.copy(env_example, env_file)
        print("✅ 已创建 .env 文件")
        print("💡 请根据需要修改 .env 中的配置")
        return True
    except Exception as e:
        print(f"❌ 创建 .env 文件失败: {e}")
        return False

def install_dependencies():
    """安装依赖包"""
    print("📦 安装依赖包...")
    
    requirements_file = project_root / "requirements.txt"
    if not requirements_file.exists():
        print("❌ requirements.txt 文件不存在")
        return False
    
    try:
        # 检查是否在虚拟环境中
        in_venv = hasattr(sys, 'real_prefix') or (
            hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix
        )
        
        if not in_venv:
            print("⚠️  建议在虚拟环境中运行")
            print("💡 创建虚拟环境: python -m venv venv")
            print("💡 激活虚拟环境: venv\\Scripts\\activate (Windows) 或 source venv/bin/activate (Linux/Mac)")
            
            response = input("是否继续安装到全局环境? (y/N): ")
            if response.lower() != 'y':
                return False
        
        print("正在安装依赖包...")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ 依赖包安装成功")
            return True
        else:
            print(f"❌ 依赖包安装失败: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ 安装依赖包时出错: {e}")
        return False

def initialize_database():
    """初始化数据库"""
    print("🗄️  初始化数据库...")
    
    try:
        # 添加项目路径
        sys.path.insert(0, str(project_root))
        
        # 导入并运行数据库初始化
        from init_db import main as init_db_main
        
        success = init_db_main()
        if success:
            print("✅ 数据库初始化成功")
        else:
            print("❌ 数据库初始化失败")
        
        return success
        
    except Exception as e:
        print(f"❌ 数据库初始化出错: {e}")
        return False

def show_next_steps():
    """显示后续步骤"""
    print("\n🎉 环境设置完成！")
    print("=" * 50)
    print("📋 后续步骤:")
    print()
    print("1. 启动开发服务器:")
    print("   python run_server.py")
    print()
    print("2. 访问API文档:")
    print("   http://localhost:8000/docs")
    print()
    print("3. 测试API接口:")
    print("   python test_auth.py")
    print()
    print("4. 修改配置 (可选):")
    print("   编辑 .env 文件")
    print()
    print("💡 提示:")
    print("   - 开发环境默认使用微信Mock模式")
    print("   - 数据库文件: live_debate.db")
    print("   - 日志级别: INFO")

def main():
    """主函数"""
    print("🚀 直播辩论后端 - 快速开始")
    print("=" * 50)
    
    steps = [
        ("检查Python版本", check_python_version),
        ("创建环境配置", create_env_file),
        ("安装依赖包", install_dependencies),
        ("初始化数据库", initialize_database),
    ]
    
    for step_name, step_func in steps:
        print(f"\n📍 {step_name}...")
        if not step_func():
            print(f"\n❌ {step_name}失败，请检查错误信息")
            return False
    
    show_next_steps()
    return True

if __name__ == "__main__":
    try:
        success = main()
        if not success:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n👋 用户取消操作")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 意外错误: {e}")
        sys.exit(1)