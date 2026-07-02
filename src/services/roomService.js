import { authFetch } from './authService';

// API: Get all rooms of current user
export async function getRoomChat() {
  return authFetch('/rooms', { method: 'GET' });
}

export async function getMessageRoomChat(roomID, options = {}) {
  const { beforeId = 0, limit = 40 } = options;

  const params = new URLSearchParams();

  if (beforeId && Number(beforeId) > 0) {
    params.set('before_id', String(beforeId));
  }

  if (limit && Number(limit) > 0) {
    params.set('limit', String(limit));
  }

  const query = params.toString();
  const url = query
    ? `/rooms/messages/${roomID}?${query}`
    : `/rooms/messages/${roomID}`;

  return authFetch(url, { method: 'GET' });
}

// Lấy full_name của user partner trong direct room
export async function getDirectPartnerName(roomID) {
  return authFetch(`/rooms/direct-name/${roomID}`, { method: 'GET' });
}

export async function createGroupChat(name, member_ids) {
  return authFetch('/rooms/group', {
    method: 'POST',
    body: JSON.stringify({ name, member_ids }),
  });
}

export async function addMembersToRoom(room_id, user_ids) {
  return authFetch('/rooms/add-member', {
    method: 'POST',
    body: JSON.stringify({ room_id, user_ids }),
  });
}

export async function searchUsers(keyword, limit = 20) {
  // optional: tự chặn search quá ngắn, tránh gọi API
  if (!keyword || keyword.trim().length < 2) {
    return { users: [] };
  }

  const params = new URLSearchParams({
    q: keyword.trim(),
    limit: String(limit),
  });

  return authFetch(`/users/search?${params.toString()}`, { method: 'GET' });
}

export async function markRoomAsRead(roomId) {
  return authFetch(`/rooms/read/${roomId}`, { method: 'POST' });
}

export async function getRoomMembers(roomId) {
  return authFetch(`/rooms/members/${roomId}`, { method: 'GET' });
}

export async function removeMemberFromRoom(roomId, userId) {
  return authFetch(`/rooms/${roomId}/members/${userId}`, { method: 'DELETE' });
}

export async function deleteRoom(roomId) {
  return authFetch(`/rooms/delete/${roomId}`, { method: 'DELETE' });
}

export async function uploadRoomImage(roomId, file) {
  const formData = new FormData();
  formData.append('file', file);

  return authFetch(`/rooms/upload-image/${roomId}`, {
    method: 'POST',
    body: formData,
  });
}
