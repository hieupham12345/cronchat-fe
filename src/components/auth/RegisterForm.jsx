import { useState } from 'react';
import { createUser } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import '../../pages/login/LoginPage.css';

function RegisterForm({ onSwitchToLogin }) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: 'random_email@gmail.com',
    phone: '0123456789',
    role: 'user',
    avatarUrl: '',
  });

  const [loading, setLoading] = useState(false);

  // ⭐️ MINI POPUP MESSAGE STATE
  const [popup, setPopup] = useState(null);
  // popup = { type: 'error' | 'success', text: string, onOk?: function }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setPopup(null);

    // === CHECK PASSWORD KHỚP ===
    if (form.password !== form.confirmPassword) {
      setPopup({
        type: 'error',
        text: 'Passwords do not match!',
      });
      return;
    }

    try {
      setLoading(true);

      const res = await createUser({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        avatarUrl: form.avatarUrl,
      });

      if (res.error) {
        let msg = 'Register failed!';
        switch (res.error) {
          case 'USERNAME_EXISTS':
            msg = 'Username already exists!';
            break;
          case 'INVALID_EMAIL':
            msg = 'Invalid email format!';
            break;
          case 'INVALID_PHONE':
            msg = 'Invalid phone number!';
            break;
          case 'INVALID_ROLE':
            msg = 'Invalid role!';
            break;
          default:
            msg = res.message || 'Register failed!';
        }

        setPopup({
          type: 'error',
          text: msg,
        });

        return;
      }

      // === SUCCESS ===
      let msg = 'Register successfully! Please login.';

      setPopup({
        type: 'success',
        text: msg,
        onOk: () => {
          setPopup(null);
          onSwitchToLogin(); // quay sang login sau khi OK
        },
      });

    } catch (err) {
      setPopup({
        type: 'error',
        text: err.message || 'Register failed!',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            className="form-input"
            name="username"
            value={form.username}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input
            className="form-input"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            className="form-input"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Nhập tên thật của bạn"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="abc@gmail.com"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Phone</label>
          <input
            className="form-input"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="0123456789"
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className={`btn-primary ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Register'}
          </button>
        </div>
      </form>

      {/* ⭐️ MINI POPUP UI */}
      {popup && (
        <div
          className="mini-popup-overlay"
          onClick={() => setPopup(null)}
        >
          <div
            className="mini-popup-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mini-popup-title">
              {popup.type === 'error' ? 'Error' : 'Success'}
            </div>

            <div className="mini-popup-text">{popup.text}</div>

            <div className="mini-popup-actions">
              <button
                type="button"
                className="mini-popup-btn-primary"
                onClick={() => {
                  if (popup.onOk) popup.onOk();
                  else setPopup(null);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RegisterForm;
