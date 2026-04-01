from pathlib import Path

p = Path(r'd:\Desktop\project\Live-main\login.html')
s = p.read_text(encoding='utf-8')
s = s.replace(
"""        <div class="info-box">
            💡 提示：选择下方演示账户快速登录，或输入自定义用户信息
        </div>
        
        <form id="loginForm">""",
"""        <div class="info-box">
            💡 提示：后台管理页面必须先登录，系统会根据角色自动分配可见页面
        </div>

        <div class="access-note">
            <div><strong>管理员：</strong>登录后进入完整后台管理页面</div>
            <div><strong>评委：</strong>登录后仅进入“辩论流程”页面</div>
        </div>
        
        <form id="loginForm">""",
1)
start = s.index("    <script>")
end = s.index("</body>", start)
new_script = """    <script>
        function getLoginRedirectTarget(role) {
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            if (role === 'admin') {
                return redirect || '/admin';
            }
            if (role === 'judge') {
                if (redirect && redirect.startsWith('/admin')) {
                    return redirect.includes('?') ? `${redirect}&role=judge` : `${redirect}?role=judge`;
                }
                return '/admin?role=judge';
            }
            return '/';
        }

        function redirectLoggedInUser(userData) {
            const role = String(userData?.role || '').toLowerCase();
            if (role === 'admin' || role === 'judge') {
                window.location.replace(getLoginRedirectTarget(role));
                return true;
            }
            return false;
        }

        function quickLogin(username, role) {
            document.getElementById('username').value = username;
            document.getElementById('role').value = role;
            performLogin(username, role);
        }
        
        function performLogin(username, role) {
            const loginBtn = document.getElementById('loginBtn');
            const loginError = document.getElementById('loginError');
            const loginSuccess = document.getElementById('loginSuccess');
            
            loginBtn.classList.add('loading');
            loginBtn.disabled = true;
            loginError.style.display = 'none';
            loginSuccess.style.display = 'none';
            
            setTimeout(() => {
                try {
                    const userData = {
                        username: username,
                        role: role,
                        loginTime: new Date().toISOString(),
                        token: 'mock_token_' + Math.random().toString(36).substr(2, 9)
                    };
                    
                    localStorage.setItem('user', JSON.stringify(userData));
                    
                    loginSuccess.textContent = `✓ 登录成功！欢迎 ${username}`;
                    loginSuccess.style.display = 'block';
                    
                    setTimeout(() => {
                        window.location.href = getLoginRedirectTarget(role);
                    }, 800);
                } catch (error) {
                    loginError.textContent = '登录失败：' + error.message;
                    loginError.style.display = 'block';
                    loginBtn.classList.remove('loading');
                    loginBtn.disabled = false;
                }
            }, 800);
        }
        
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const role = document.getElementById('role').value;
            
            if (!username) {
                document.getElementById('usernameError').textContent = '请输入用户名';
                document.getElementById('usernameError').style.display = 'block';
                return;
            }
            
            performLogin(username, role);
        });
        
        window.addEventListener('load', () => {
            const user = localStorage.getItem('user');
            if (user) {
                const userData = JSON.parse(user);
                document.getElementById('username').value = userData.username;
                document.getElementById('role').value = userData.role;

                if (redirectLoggedInUser(userData)) {
                    return;
                }
            }
        });
    </script>
"""
s = s[:start] + new_script + s[end:]
p.write_text(s, encoding='utf-8')
print('patched-login-page')
