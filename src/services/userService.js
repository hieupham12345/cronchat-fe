import { authFetch } from './authService';

export async function getListUser() {
  return authFetch('/get-all-user-listing', { method: 'GET' });
}

export async function getDirectChat(userID) {
  return authFetch(`/rooms/direct/${userID}`, { method: 'GET' });
}

/**
 * Upload avatar cho current user.
 * - file: object File từ <input type="file">
 * BE đọc field "file" trong multipart form.
 * BE trả: { success: true, avatar_url: "/static/user_avatars/..." }
 */
export async function uploadAvatar(file) {
  if (!file) {
    throw new Error('Missing file');
  }

  const formData = new FormData();
  // phải trùng với r.FormFile("file") ở BE
  formData.append('file', file);

  return authFetch('/users/avatar', {
    method: 'POST',
    body: formData,
  });
}

// Lấy info user hiện tại từ BE (dựa vào JWT trong header)
export async function getUserInfo() {
  return authFetch('/me', { method: 'GET' });
}

// update user info
export async function updateUserInfo(data) {
  return authFetch('/update-user', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// update password
export async function updatePassword(data) {
  return authFetch('/update-password', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
