import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import { refreshAccessToken } from '../../services/authService';
import './LoginPage.css';

function LoginPage() {
  const [mode, setMode] = useState('login');
  const navigate = useNavigate();

  // optional: state để sau này nếu muốn show loading riêng
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAndRedirect() {
      try {
        // Nếu không có currentUser trong localStorage => coi như chưa login
        const stored = localStorage.getItem('currentUser');
        if (!stored) {
          return;
        }

        // Lúc này RAM KHÔNG có access_token (vì load lại trang),
        // nhưng cookie vẫn còn refresh_token.
        // Thử gọi refreshAccessToken:
        //
        // Giả định refreshAccessToken:
        // - gọi /auth/refresh
        // - nếu success => set accessToken vào RAM và RETURN token (string)
        // - nếu fail => throw hoặc return null/undefined
        const newToken = await refreshAccessToken();

        if (!isMounted) return;

        if (newToken) {
          // Có token mới => user vẫn còn phiên hợp lệ => đẩy về dashboard
          navigate('/dashboard', { replace: true });
        }
        // Nếu không có token => cứ ở lại trang login bình thường
      } catch (err) {
        // refresh fail thì thôi, cho user login lại
        console.error('Auto refresh on /login failed:', err);
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    checkAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-title">CronChat</div>
        <div className="login-env">Hội những người rảnh rỗi</div>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        {/* 
          Nếu muốn, có thể chặn hiển thị form khi đang check session:
          {checkingSession ? <div className="checking-text">Checking session...</div> : ...}
          Ở đây tao vẫn render form bình thường, vì nếu refresh thành công thì nó sẽ navigate luôn.
        */}
        {mode === 'login' ? (
          <LoginForm onSwitchToRegister={() => setMode('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}

export default LoginPage;
