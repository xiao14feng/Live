"""
用户认证模块测试脚本
用于快速验证API功能
"""
import asyncio
import httpx
import json
from datetime import datetime


class AuthTester:
    """认证API测试类"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def test_root_endpoint(self):
        """测试根路径"""
        print("🧪 测试根路径...")
        try:
            response = await self.client.get(f"{self.base_url}/")
            print(f"✅ 状态码: {response.status_code}")
            print(f"📄 响应: {response.json()}")
            return response.status_code == 200
        except Exception as e:
            print(f"❌ 错误: {e}")
            return False
    
    async def test_health_check(self):
        """测试健康检查"""
        print("\n🧪 测试健康检查...")
        try:
            response = await self.client.get(f"{self.base_url}/health")
            print(f"✅ 状态码: {response.status_code}")
            print(f"📄 响应: {response.json()}")
            return response.status_code == 200
        except Exception as e:
            print(f"❌ 错误: {e}")
            return False
    
    async def test_wechat_login_mock(self):
        """测试微信登录 (Mock模式)"""
        print("\n🧪 测试微信登录 (Mock模式)...")
        
        # 测试数据
        login_data = {
            "code": "test_code_123456",
            "userInfo": {
                "nickName": "测试用户",
                "avatarUrl": "https://example.com/avatar.jpg"
            }
        }
        
        try:
            response = await self.client.post(
                f"{self.base_url}/api/wechat-login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"✅ 状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"📄 响应数据:")
                print(f"   - success: {data.get('success')}")
                print(f"   - message: {data.get('message')}")
                print(f"   - openid: {data.get('data', {}).get('openid', 'N/A')}")
                print(f"   - isMock: {data.get('data', {}).get('isMock', 'N/A')}")
                print(f"   - token: {data.get('data', {}).get('token', 'N/A')[:50]}...")
                return True
            else:
                print(f"❌ 错误响应: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 错误: {e}")
            return False
    
    async def test_wechat_login_invalid_code(self):
        """测试微信登录 (无效code)"""
        print("\n🧪 测试微信登录 (无效code)...")
        
        login_data = {
            "code": "",  # 空code
            "userInfo": {
                "nickName": "测试用户",
                "avatarUrl": "https://example.com/avatar.jpg"
            }
        }
        
        try:
            response = await self.client.post(
                f"{self.base_url}/api/wechat-login",
                json=login_data
            )
            
            print(f"✅ 状态码: {response.status_code}")
            
            if response.status_code == 422:  # 验证错误
                print("✅ 正确返回验证错误")
                return True
            else:
                print(f"❌ 意外状态码: {response.status_code}")
                print(f"📄 响应: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 错误: {e}")
            return False
    
    async def test_users_list(self):
        """测试用户列表"""
        print("\n🧪 测试用户列表...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/admin/users")
            
            print(f"✅ 状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"📄 响应数据:")
                print(f"   - success: {data.get('success')}")
                print(f"   - total: {data.get('total')}")
                print(f"   - page: {data.get('page')}")
                print(f"   - users count: {len(data.get('data', []))}")
                return True
            else:
                print(f"❌ 错误响应: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 错误: {e}")
            return False
    
    async def test_user_stats(self):
        """测试用户统计"""
        print("\n🧪 测试用户统计...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/admin/miniprogram/users")
            
            print(f"✅ 状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"📄 响应数据:")
                print(f"   - success: {data.get('success')}")
                stats = data.get('data', {})
                print(f"   - total_users: {stats.get('total_users')}")
                print(f"   - active_users: {stats.get('active_users')}")
                print(f"   - new_users_today: {stats.get('new_users_today')}")
                print(f"   - total_votes: {stats.get('total_votes')}")
                return True
            else:
                print(f"❌ 错误响应: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 错误: {e}")
            return False
    
    async def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始运行用户认证模块测试")
        print("=" * 50)
        
        tests = [
            ("根路径", self.test_root_endpoint),
            ("健康检查", self.test_health_check),
            ("微信登录(Mock)", self.test_wechat_login_mock),
            ("微信登录(无效code)", self.test_wechat_login_invalid_code),
            ("用户列表", self.test_users_list),
            ("用户统计", self.test_user_stats),
        ]
        
        results = []
        
        for test_name, test_func in tests:
            try:
                result = await test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"❌ 测试 {test_name} 异常: {e}")
                results.append((test_name, False))
        
        # 输出测试结果
        print("\n" + "=" * 50)
        print("📊 测试结果汇总:")
        print("=" * 50)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
            if result:
                passed += 1
        
        print("=" * 50)
        print(f"📈 通过率: {passed}/{total} ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 所有测试通过！")
        else:
            print("⚠️  部分测试失败，请检查服务器状态")
        
        await self.client.aclose()


async def main():
    """主函数"""
    print("🔧 用户认证模块测试工具")
    print(f"⏰ 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 检查服务器是否运行
    print("🔍 检查服务器状态...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/health", timeout=5.0)
            if response.status_code == 200:
                print("✅ 服务器运行正常")
            else:
                print(f"⚠️  服务器响应异常: {response.status_code}")
    except Exception as e:
        print(f"❌ 无法连接到服务器: {e}")
        print("💡 请确保服务器已启动: python -m app.main")
        return
    
    print()
    
    # 运行测试
    tester = AuthTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())