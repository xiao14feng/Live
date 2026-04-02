"""
测试投票API功能
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_judge_assignment():
    """测试评委分配"""
    print("\n=== 测试评委分配 ===")
    
    # 1. 保存评委分配
    data = {
        "stream_id": "test_stream_001",
        "judges": [
            {
                "slot": 1,
                "userId": "judge_001",
                "name": "评委张三",
                "avatar": "/static/avatar1.png",
                "role": "judge",
                "votes": 0
            },
            {
                "slot": 2,
                "userId": "judge_002",
                "name": "评委李四",
                "avatar": "/static/avatar2.png",
                "role": "judge",
                "votes": 0
            },
            {
                "slot": 3,
                "userId": "judge_003",
                "name": "评委王五",
                "avatar": "/static/avatar3.png",
                "role": "judge",
                "votes": 0
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/v1/admin/judges", json=data)
    print(f"保存评委分配: {response.status_code}")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    # 2. 查询评委分配
    response = requests.get(f"{BASE_URL}/v1/admin/judges?stream_id=test_stream_001")
    print(f"\n查询评委分配: {response.status_code}")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    return response.json()

def test_judge_vote_status():
    """测试评委投票状态查询"""
    print("\n=== 测试评委投票状态 ===")
    
    response = requests.get(
        f"{BASE_URL}/v1/judge-vote/status",
        params={
            "stream_id": "test_stream_001",
            "user_id": "judge_001"
        }
    )
    print(f"查询投票状态: {response.status_code}")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    return response.json()

def test_judge_vote():
    """测试评委投票"""
    print("\n=== 测试评委投票 ===")
    
    # 评委1投票给正方
    data = {
        "stream_id": "test_stream_001",
        "user_id": "judge_001",
        "side": "left"
    }
    
    response = requests.post(f"{BASE_URL}/v1/judge-vote", json=data)
    print(f"评委投票: {response.status_code}")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    # 再次查询状态
    response = requests.get(
        f"{BASE_URL}/v1/judge-vote/status",
        params={
            "stream_id": "test_stream_001",
            "user_id": "judge_001"
        }
    )
    print(f"\n投票后状态: {response.status_code}")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    return response.json()

def test_get_judge_votes():
    """测试获取评委投票记录"""
    print("\n=== 测试获取评委投票记录 ===")
    
    response = requests.get(
        f"{BASE_URL}/v1/admin/judge-votes",
        params={"stream_id": "test_stream_001"}
    )
    print(f"获取投票记录: {response.status_code}")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    return response.json()

def test_get_votes():
    """测试获取投票汇总"""
    print("\n=== 测试获取投票汇总 ===")
    
    response = requests.get(
        f"{BASE_URL}/votes",
        params={"stream_id": "test_stream_001"}
    )
    print(f"获取投票汇总: {response.status_code}")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    return response.json()

def main():
    """运行所有测试"""
    print("=" * 60)
    print("开始测试投票API")
    print("=" * 60)
    
    try:
        # 1. 测试评委分配
        test_judge_assignment()
        
        # 2. 测试投票状态查询
        test_judge_vote_status()
        
        # 3. 测试评委投票
        test_judge_vote()
        
        # 4. 测试获取投票记录
        test_get_judge_votes()
        
        # 5. 测试获取投票汇总
        test_get_votes()
        
        print("\n" + "=" * 60)
        print("✅ 所有测试完成")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 连接失败: 请确保后端服务正在运行 (http://localhost:8000)")
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
