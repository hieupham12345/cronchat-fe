import { apiFetch } from './apiClient';
import { getAccessToken } from './authService';


export async function getListUser() {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');

  // GET request không dùng body, chỉ gửi headers
  return apiFetch('/get-all-user-listing', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getDirectChat(userID) {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');

  // GET request không dùng body, chỉ gửi headers
  return apiFetch(`/rooms/direct/${userID}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Upload avatar cho current user.
 * - file: object File từ <input type="file">
 * BE đọc field "file" trong multipart form.
 * BE trả: { success: true, avatar_url: "/static/user_avatars/..." }
 */
export async function uploadAvatar(file) {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');

  if (!file) {
    throw new Error('Missing file');
  }

  const formData = new FormData();
  // phải trùng với r.FormFile("file") ở BE
  formData.append('file', file);

  return apiFetch('/users/avatar', {
    method: 'POST',
    headers: {
      // KHÔNG set 'Content-Type' ở đây để browser tự set boundary
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

// Lấy info user hiện tại từ BE (dựa vào JWT trong header)
export async function getUserInfo() {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Missing access token')
  }

  return apiFetch('/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// update user info
export async function updateUserInfo(data) {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Missing access token')
  }

  return apiFetch('/update-user', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
}

// update user info
export async function updatePassword(data) {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Missing access token')
  }

  return apiFetch('/update-password', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
}
