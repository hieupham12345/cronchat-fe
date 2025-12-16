// src/services/authService.js
import { apiFetch } from './apiClient';

// ===============================
//   ACCESS TOKEN (RAM ONLY)
// ===============================
let inMemoryAccessToken = null;
let refreshTimeoutId = null; // timer cho auto-refresh

// ---------------------------------
//  SCHEDULE AUTO REFRESH
// ---------------------------------
function scheduleTokenRefresh(token) {
  // clear timer cũ nếu có
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }

  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return;

    const nowSec = Math.floor(Date.now() / 1000);
    // refresh trước khi hết hạn 30s (tuỳ mày chỉnh 10s / 60s)
    const refreshAtSec = payload.exp - 30;
    const delayMs = (refreshAtSec - nowSec) * 1000;

    if (delayMs <= 0) {
      // gần hết hạn / hết rồi -> refresh luôn
      refreshAccessToken().catch((err) => {
        console.error('Auto refresh (immediate) failed:', err);
        // optional: clearAccessToken();
      });
      return;
    }

    // Đặt timer auto refresh
    refreshTimeoutId = setTimeout(async () => {
      try {
        await refreshAccessToken();
      } catch (err) {
        console.error('Auto refresh failed:', err);
        // Nếu muốn: clearAccessToken() để buộc login lại khi call API
      }
    }, delayMs);
  } catch (err) {
    console.error('scheduleTokenRefresh error:', err);
  }
}

// ===============================
//   TOKEN HANDLING (RAM ONLY)
// ===============================
export function setAccessToken(token) {
  inMemoryAccessToken = token || null;
  // mỗi lần set token mới -> setup lại timer
  scheduleTokenRefresh(token);
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function clearAccessToken() {
  inMemoryAccessToken = null;

  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
}

// ===============================
//   TOKEN VALIDATION
// ===============================
export function isTokenValid() {
  const token = inMemoryAccessToken;
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp && payload.exp > now;
  } catch {
    return false;
  }
}

// ===============================
//   AUTH API
// ===============================
export async function login(username, password) {
  const data = await apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    credentials: 'include', // nhận cookie refresh_token
  });

  if (data.accessToken) {
    // ⬇️ setAccessToken giờ sẽ tự schedule auto-refresh luôn
    setAccessToken(data.accessToken);
  }

  return data;
}

export async function createUser({
  username,
  password,
  role,
  fullName,
  email,
  phone,
  avatarUrl,
}) {
  const payload = {
    username,
    password,
    role,
    full_name: fullName,
    email,
    phone,
    avatar_url: avatarUrl,
  };

  return await apiFetch('/create-user', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ===============================
//   REFRESH TOKEN (COOKIE)
// ===============================
export async function refreshAccessToken() {
  const data = await apiFetch('/auth/refresh', {
    method: 'POST',
    credentials: 'include', // gửi cookie refresh
  });

  if (!data.accessToken) {
    throw new Error('No access token returned');
  }

  // ⬇️ setAccessToken sẽ tự update token + setup timer mới
  setAccessToken(data.accessToken);
  return data.accessToken;
}

export async function logout() {
  clearAccessToken(); // xoá token trong RAM + clear timer
  try {
    await apiFetch('/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err) {
    console.error('Logout error:', err);
  }
}

