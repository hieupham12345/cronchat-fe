import { useState } from 'react';
import { login } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import './LoginForm.css';

function LoginForm() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);

      const data = await login(form.username, form.password);
      // login: gọi API, set accessToken vào RAM

      if (!data || !data.accessToken) {
        throw new Error('No access token from server');
      }

      // data = {
      //   id, username, full_name, email, phone,
      //   avatar_url, role, last_login, login_ip,
      //   accessToken
      // }
      const { accessToken, ...userWithoutToken } = data;

      // Chỉ lưu user info, không lưu accessToken
      localStorage.setItem('currentUser', JSON.stringify(userWithoutToken));

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="form-input"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="Enter your username"
          value={form.username}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="form-input"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="form-actions">
        <button
          type="submit"
          className={`btn-primary ${loading ? 'loading' : ''}`}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </form>
  );
}

export default LoginForm;
