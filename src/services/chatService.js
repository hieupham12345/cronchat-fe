// src/services/.js
import { apiFetch } from './apiClient';
import { getAccessToken } from './authService';


export async function sendMessage(roomId, content, messageType = 'text', replyID = null) {
  const token = getAccessToken();
  if (!token) throw new Error('Missing access token');

  return apiFetch(`/rooms/send-messages/${roomId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content,
      message_type: messageType,
      reply_to_message_id: replyID,
    }),
  });
}

// ==========================
// 1) TOGGLE REACTION
// POST /messages/react/add
// Body: { message_id: number, reaction: string }
// Resp: { message_id, reaction, added }
// ==========================
export async function toggleReaction(messageId, reaction) {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token");

  if (!messageId || Number(messageId) <= 0) throw new Error("Invalid messageId");
  if (!reaction || !String(reaction).trim()) throw new Error("Reaction is required");

  return apiFetch("/messages/react/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message_id: Number(messageId),
      reaction: String(reaction).trim(),
    }),
  });
}

// ==========================
// 2) REMOVE 1 REACTION (remove cứng)
// POST /messages/react/remove
// Body: { message_id: number, reaction: string }
// Resp: { message_id, reaction, removed: true }
// ==========================
export async function removeReaction(messageId, reaction) {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token");

  if (!messageId || Number(messageId) <= 0) throw new Error("Invalid messageId");
  if (!reaction || !String(reaction).trim()) throw new Error("Reaction is required");

  return apiFetch("/messages/react/remove", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message_id: Number(messageId),
      reaction: String(reaction).trim(),
    }),
  });
}

// ==========================
// 3) REMOVE ALL MY REACTIONS ON A MESSAGE
// POST /messages/react/remove
// Body: { message_id: number, reaction: "" }
// Resp: { message_id, removed: true, all: true }
// ==========================
export async function removeAllMyReactions(messageId) {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token");

  if (!messageId || Number(messageId) <= 0) throw new Error("Invalid messageId");

  return apiFetch("/messages/react/remove", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message_id: Number(messageId),
      reaction: "",
    }),
  });
}

// ==========================
// 4) GET REACTION SUMMARY
// GET /messages/reactions/{messageId}
// Resp: { message_id, reactions: [{reaction,count,reacted_by_me}] }
// ==========================
export async function getReactionSummary(messageId) {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token");

  if (!messageId || Number(messageId) <= 0) throw new Error("Invalid messageId");

  return apiFetch(`/messages/reactions/${Number(messageId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// =========================
// SEEN / RECEIPTS
// =========================

// POST /rooms/seen
// body: { room_id, up_to_message_id }
export async function markRoomSeenUpTo(roomId, upToMessageId) {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token");

  const rid = Number(roomId);
  const mid = Number(upToMessageId);

  if (!rid || rid <= 0) throw new Error("Invalid roomId");
  if (!mid || mid <= 0) throw new Error("Invalid upToMessageId");

  return apiFetch(`/rooms/seen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      room_id: rid,
      up_to_message_id: mid,
    }),
  });
}

// GET /rooms/last-seen/{roomID}
export async function getRoomLastSeen(roomId) {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token");

  const rid = Number(roomId);
  if (!rid || rid <= 0) throw new Error("Invalid roomId");

  return apiFetch(`/rooms/last-seen/${rid}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// GET /messages/seen/summary/{messageID}
export async function getMessageSeenSummary(messageId) {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token");

  const mid = Number(messageId);
  if (!mid || mid <= 0) throw new Error("Invalid messageId");

  return apiFetch(`/messages/seen/summary/${mid}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// GET /messages/seen/users/{messageID}?limit=50
export async function listMessageSeenUsers(messageId, limit = 50) {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token");

  const mid = Number(messageId);
  if (!mid || mid <= 0) throw new Error("Invalid messageId");

  const lim = Number(limit);
  const safeLimit = lim && lim > 0 ? Math.min(lim, 200) : 50;

  return apiFetch(`/messages/seen/users/${mid}?limit=${safeLimit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// GET /rooms/unread-counts
// return: { user_id, counts: { [roomId]: unreadCount } }
export async function getUnreadCountsByRooms() {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token");

  return apiFetch(`/rooms/unread-counts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// GET /rooms/unread/{roomID}
// return: { room_id, user_id, unread_count }
export async function getUnreadCountForRoom(roomId) {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token");

  const rid = Number(roomId);
  if (!rid || rid <= 0) throw new Error("Invalid roomId");

  return apiFetch(`/rooms/unread/${rid}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}




