import { apiFetch } from './apiClient';
import { getAccessToken } from './authService';


// API: Get all rooms of current user
export async function getRoomChat() {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');

  // GET request không dùng body, chỉ gửi headers
  return apiFetch('/rooms', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getMessageRoomChat(roomID, options = {}) {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');

  const { beforeId = 0, limit = 40 } = options;

  const params = new URLSearchParams();

  if (beforeId && Number(beforeId) > 0) {
    params.set('before_id', String(beforeId));
  }

  if (limit && Number(limit) > 0) {
    params.set('limit', String(limit));
  }

  const query = params.toString();

  // 🔥 MUST HAVE THE SLASH HERE
  const url = query
    ? `/rooms/messages/${roomID}?${query}`
    : `/rooms/messages/${roomID}`;

  return apiFetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Lấy full_name của user partner trong direct room
export async function getDirectPartnerName(roomID) {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');
  
  return apiFetch(`/rooms/direct-name/${roomID}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createGroupChat(name, member_ids) {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');
  
  return apiFetch(`/rooms/group`, {
    method: 'POST',
    body: JSON.stringify({ name, member_ids }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function addMembersToRoom(room_id, user_ids) {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');      
  return apiFetch('/rooms/add-member', {
    method: 'POST',
    body: JSON.stringify({ room_id, user_ids }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function searchUsers(keyword, limit = 20) {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');

  // optional: tự chặn search quá ngắn, tránh gọi API
  if (!keyword || keyword.trim().length < 2) {
    return { users: [] };
  }

  const params = new URLSearchParams({
    q: keyword.trim(),
    limit: String(limit),
  });

  return apiFetch(`/users/search?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function markRoomAsRead(roomId) {
  const token = getAccessToken()
  if (!token) throw new Error('Missing access token')

  return apiFetch(`/rooms/read/${roomId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getRoomMembers(roomId) {
  const token = getAccessToken()
  if (!token) throw new Error('Missing access token')

  return apiFetch(`/rooms/members/${roomId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}


export async function removeMemberFromRoom(roomId, userId) {
  const token = getAccessToken()
  if (!token) throw new Error('Missing access token')
  return apiFetch(`/rooms/${roomId}/members/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function deleteRoom(roomId) {
  const token = getAccessToken()
  if (!token) throw new Error('Missing access token')
  return apiFetch(`/rooms/delete/${roomId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function uploadRoomImage(roomId, file) {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');

  const formData = new FormData();
  formData.append('file', file);

  // ✅ phải return dữ liệu json
  return apiFetch(`/rooms/upload-image/${roomId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}
