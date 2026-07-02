// src/services/chatService.js
import { authFetch } from './authService';

export async function sendMessage(roomId, content, messageType = 'text', replyID = null) {
  return authFetch(`/rooms/send-messages/${roomId}`, {
    method: 'POST',
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
  if (!messageId || Number(messageId) <= 0) throw new Error("Invalid messageId");
  if (!reaction || !String(reaction).trim()) throw new Error("Reaction is required");

  return authFetch("/messages/react/add", {
    method: "POST",
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
  if (!messageId || Number(messageId) <= 0) throw new Error("Invalid messageId");
  if (!reaction || !String(reaction).trim()) throw new Error("Reaction is required");

  return authFetch("/messages/react/remove", {
    method: "POST",
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
  if (!messageId || Number(messageId) <= 0) throw new Error("Invalid messageId");

  return authFetch("/messages/react/remove", {
    method: "POST",
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
  if (!messageId || Number(messageId) <= 0) throw new Error("Invalid messageId");

  return authFetch(`/messages/reactions/${Number(messageId)}`, { method: "GET" });
}

// =========================
// SEEN / RECEIPTS
// =========================

// POST /rooms/seen
// body: { room_id, up_to_message_id }
export async function markRoomSeenUpTo(roomId, upToMessageId) {
  const rid = Number(roomId);
  const mid = Number(upToMessageId);

  if (!rid || rid <= 0) throw new Error("Invalid roomId");
  if (!mid || mid <= 0) throw new Error("Invalid upToMessageId");

  return authFetch(`/rooms/seen`, {
    method: "POST",
    body: JSON.stringify({
      room_id: rid,
      up_to_message_id: mid,
    }),
  });
}

// GET /rooms/last-seen/{roomID}
export async function getRoomLastSeen(roomId) {
  const rid = Number(roomId);
  if (!rid || rid <= 0) throw new Error("Invalid roomId");

  return authFetch(`/rooms/last-seen/${rid}`, { method: "GET" });
}

// GET /messages/seen/summary/{messageID}
export async function getMessageSeenSummary(messageId) {
  const mid = Number(messageId);
  if (!mid || mid <= 0) throw new Error("Invalid messageId");

  return authFetch(`/messages/seen/summary/${mid}`, { method: "GET" });
}

// GET /messages/seen/users/{messageID}?limit=50
export async function listMessageSeenUsers(messageId, limit = 50) {
  const mid = Number(messageId);
  if (!mid || mid <= 0) throw new Error("Invalid messageId");

  const lim = Number(limit);
  const safeLimit = lim && lim > 0 ? Math.min(lim, 200) : 50;

  return authFetch(`/messages/seen/users/${mid}?limit=${safeLimit}`, { method: "GET" });
}

// GET /rooms/unread-counts
// return: { user_id, counts: { [roomId]: unreadCount } }
export async function getUnreadCountsByRooms() {
  return authFetch(`/rooms/unread-counts`, { method: "GET" });
}

// GET /rooms/unread/{roomID}
// return: { room_id, user_id, unread_count }
export async function getUnreadCountForRoom(roomId) {
  const rid = Number(roomId);
  if (!rid || rid <= 0) throw new Error("Invalid roomId");

  return authFetch(`/rooms/unread/${rid}`, { method: "GET" });
}
