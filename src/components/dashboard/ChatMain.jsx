// src/components/dashboard/ChatMain.jsx
import { useEffect, useRef, useState, useMemo, useCallback, useLayoutEffect, Fragment } from 'react';
import '../../pages/dashboard/DashBoardPage.css';
import ChatMessageItem from './ChatMessageItem.jsx';
import ChatMainHeader from './ChatMainHeader.jsx';
import buildAvatarUrl from '../../utils/imageHandle.js';
import compressImage from '../../utils/imageCompress.js';
import { EMOJI_MAP } from '../../utils/emojiData.js';

import './ChatMain.css';
import { toggleReaction, markRoomSeenUpTo } from '../../services/chatService.js';
import EmojiPicker from './EmojiPicker.jsx';
import { getDirectPartnerName } from '../../services/roomService.js';


const EMOJI_KEYS = Object.keys(EMOJI_MAP).sort((a, b) => b.length - a.length)

// Optional: chặn replace khi đang gõ trong URL/code-ish
function shouldSkipAutoEmoji(text, caret) {
  // Skip nếu ngay trước caret là "http" hoặc "www"
  const left = text.slice(Math.max(0, caret - 50), caret).toLowerCase()
  if (left.includes('http://') || left.includes('https://') || left.includes('www.')) return true

  // Skip nếu đang ở trong inline code `...` (heuristic đơn giản)
  const before = text.slice(0, caret)
  const tickCount = (before.match(/`/g) || []).length
  if (tickCount % 2 === 1) return true

  return false
}

export function autoEmojiOnChange(e, {
  currentValue,
  setValue,
  textareaRef,
}) {
  const el = e.target
  const next = el.value
  const caret = el.selectionStart ?? next.length

  // nếu đang skip thì thôi
  if (shouldSkipAutoEmoji(next, caret)) {
    setValue(next)
    return
  }

  // tìm key match ngay trước caret
  let matchedKey = null
  for (const k of EMOJI_KEYS) {
    if (caret >= k.length && next.slice(caret - k.length, caret) === k) {
      matchedKey = k
      break
    }
  }

  if (!matchedKey) {
    setValue(next)
    return
  }

  const rep = EMOJI_MAP[matchedKey]

  // Replace đoạn matchedKey bằng emoji
  const newText =
    next.slice(0, caret - matchedKey.length) +
    rep +
    next.slice(caret)

  setValue(newText)

  // Restore caret (sau emoji)
  requestAnimationFrame(() => {
    const newCaret = caret - matchedKey.length + rep.length
    textareaRef.current?.setSelectionRange(newCaret, newCaret)
  })
}

function ChatMain({
  selectedRoom,
  loadingRooms,
  roomError,
  messages = [],
  loadingMessages,
  messageError,
  currentUserId,
  onSendMessage,
  setMessages,
  onRealtimeMessage,
  listUsers = [],
  onAddMembersToRoom,
  onSearchUsers,

  onLoadOlderMessages,
  loadingOlderMessages = false,
  hasMoreMessages = true,
  formatTime,
  RoomMembers, // API GET members
  onDeleteRoom,

  // service upload ảnh (props)
  // ✅ IMPORTANT: service của mày đang chạy theo contract: onUploadRoomImages({ roomId, files })
  onUploadRoomImages,

}) {
  const hasRoom = !!selectedRoom;

  const messagesEndRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  const wsRef = useRef(null);
  const selectedRoomRef = useRef(selectedRoom);
  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  const chatWindowRef = useRef(null);
  const loadingOlderRef = useRef(false);
  const prevScrollInfoRef = useRef({ scrollHeight: 0, scrollTop: 0 });
  const scrollTimeoutRef = useRef(null);

  const [membersInRooms, setMembersInRooms] = useState([]);

  // ----- ADD MEMBER UI -----
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchUserAdd, setSearchUserAdd] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [remoteAddUsers, setRemoteAddUsers] = useState([]);

  const [showConfirmAdd, setShowConfirmAdd] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  const [addFeedback, setAddFeedback] = useState(null); // { type, text }

  // ==========================
  // ✅ upload images state
  // ==========================
  const fileInputRef = useRef(null);
  const [pendingImages, setPendingImages] = useState([]); // [{ id, file, url }]
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const MAX_PENDING_IMAGES = 3;
  const [replyDraft, setReplyDraft] = useState(null)


    // ==========================
  // ✅ Emoji suggestion (NOT auto replace)
  // ==========================
  const [emojiSuggest, setEmojiSuggest] = useState({
    open: false,
    items: [],         // [{ key, emoji }]
    active: 0,
    start: 0,          // range replace start
    end: 0,            // range replace end (caret)
    token: '',
  })

  const closeEmojiSuggest = useCallback(() => {
    setEmojiSuggest(s => ({ ...s, open: false, items: [], token: '' }))
  }, [])

  function extractTokenBeforeCaret(text, caret) {
    // lấy đoạn "token" sát trước caret: chữ/số/_/:/-/+
    // vd "hello 100|" => token = "100"
    const left = text.slice(0, caret)

    // match token cuối cùng (không lấy space/punct)
    const m = left.match(/([a-zA-Z0-9_:+-]+)$/)
    if (!m) return { token: '', start: caret, end: caret }

    const token = m[1] || ''
    const start = caret - token.length
    const end = caret
    return { token, start, end }
  }

  function buildEmojiCandidates(token) {
    const t = String(token || '').trim()
    if (!t) return []

    // ✅ ưu tiên exact match, vẫn cho prefix để user gõ dần (tuỳ thích)
    const exact = EMOJI_MAP[t] ? [{ key: t, emoji: EMOJI_MAP[t] }] : []

    // prefix candidates (giới hạn để khỏi spam)
    // ví dụ: gõ "smi" ra ":smile:"... nếu map của mày có kiểu đó
    const prefix =
      t.length >= 2
        ? EMOJI_KEYS
            .filter(k => k !== t && k.startsWith(t))
            .slice(0, 6)
            .map(k => ({ key: k, emoji: EMOJI_MAP[k] }))
        : []

    // gộp lại: exact lên đầu
    return [...exact, ...prefix].slice(0, 7)
  }

  const applyEmojiSuggestion = useCallback((pick) => {
    const el = textareaRef.current
    if (!el) return
    if (!pick?.emoji) return

    setInputValue(prev => {
      const { start, end } = emojiSuggest
      const safeStart = Math.max(0, Math.min(start, prev.length))
      const safeEnd = Math.max(0, Math.min(end, prev.length))

      const next =
        prev.slice(0, safeStart) +
        pick.emoji +
        prev.slice(safeEnd)

      return next
    })

    requestAnimationFrame(() => {
      const el2 = textareaRef.current
      if (!el2) return
      const pos = Math.max(0, (emojiSuggest.start || 0)) + String(pick.emoji).length
      el2.focus()
      el2.setSelectionRange(pos, pos)
    })

    closeEmojiSuggest()
  }, [emojiSuggest, closeEmojiSuggest])

    const handleInputChange = useCallback((e) => {
    const el = e.target
    const next = el.value
    const caret = el.selectionStart ?? next.length

    setInputValue(next)

    // skip suggestion trong url/code-ish (xài lại hàm mày có)
    if (shouldSkipAutoEmoji(next, caret)) {
      closeEmojiSuggest()
      return
    }

    const { token, start, end } = extractTokenBeforeCaret(next, caret)

    // nếu user gõ tiếp làm token rỗng / đổi -> tự biến mất
    if (!token) {
      closeEmojiSuggest()
      return
    }

    const items = buildEmojiCandidates(token)

    if (!items.length) {
      closeEmojiSuggest()
      return
    }

    setEmojiSuggest(s => ({
      open: true,
      items,
      active: 0,
      start,
      end,
      token,
    }))
  }, [closeEmojiSuggest])


  // ==========================
  // ✅ SEEN STATE (room-level)
  // ==========================
  const [roomSeenMap, setRoomSeenMap] = useState({})
  // shape: { [roomId]: { [userId]: { user_id, full_name, avatar_url, last_seen_message_id, last_seen_at } } }

  const getUserMeta = useCallback((uid) => {
    const id = Number(uid)

    const m1 = (membersInRooms || []).find(x => Number(x.user_id) === id)
    if (m1) {
      return {
        full_name: m1.full_name || m1.username || '',
        avatar_url: m1.avatar_url || '',
      }
    }

    const u2 = (listUsers || []).find(x => Number(x.id) === id)
    if (u2) {
      return {
        full_name: u2.full_name || u2.username || '',
        avatar_url: u2.avatar_url || '',
      }
    }

    return { full_name: '', avatar_url: '' }
  }, [membersInRooms, listUsers])

  const upsertRoomSeen = useCallback((roomId, payload) => {
    if (!roomId || !payload?.user_id) return

    const rid = String(roomId)
    const uid = String(payload.user_id)
    const meta = getUserMeta(payload.user_id)

    setRoomSeenMap(prev => {
      const room = prev[rid] || {}
      const old = room[uid] || {}
      return {
        ...prev,
        [rid]: {
          ...room,
          [uid]: {
            ...old,
            user_id: payload.user_id,
            full_name: payload.full_name || old.full_name || meta.full_name,
            avatar_url: payload.avatar_url || old.avatar_url || meta.avatar_url,
            last_seen_message_id: Number(payload.last_seen_message_id) || 0,
            last_seen_at: payload.last_seen_at || old.last_seen_at,
          },
        },
      }
    })
  }, [getUserMeta])

  const lastMsgId = useMemo(() => {
    const arr = Array.isArray(messages) ? messages : []
    const last = arr[arr.length - 1]
    return last?.id ? Number(last.id) : 0
  }, [messages])

  const lastSentSeenRef = useRef(0)

  const tryMarkSeen = useCallback(async (force = false) => {
    if (!selectedRoom?.id) return
    if (!lastMsgId) return
    if (!force && !isNearBottomRef.current) return

    if (!force && lastSentSeenRef.current === lastMsgId) return
    lastSentSeenRef.current = lastMsgId

    try {
      await markRoomSeenUpTo(selectedRoom.id, lastMsgId)
    } catch (_) {}
  }, [selectedRoom?.id, lastMsgId])

  useEffect(() => {
    lastSentSeenRef.current = 0
    tryMarkSeen(true)
  }, [selectedRoom?.id, tryMarkSeen])

  useEffect(() => {
    tryMarkSeen(false)
  }, [lastMsgId, tryMarkSeen])


  const insertAtCaret = (emoji) => {
  const el = textareaRef.current
    if (!el) return

    const start = el.selectionStart ?? inputValue.length
    const end = el.selectionEnd ?? inputValue.length

    const next =
      inputValue.slice(0, start) +
      emoji +
      inputValue.slice(end)

    setInputValue(next)

    requestAnimationFrame(() => {
      const pos = start + emoji.length
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }


  // ==========================
  // ✅ ALWAYS FOCUS (FIX TRIỆT ĐỂ)
  // ==========================
  const focusRafRef = useRef(null);
  const lastFocusAtRef = useRef(0);

  const focusInput = useCallback(
  (force = false) => {
    if (!hasRoom) return;
    if (showAddMembers) return; // ✅ đang mở modal thì đừng giật focus
    if (!textareaRef.current) return;

    const el = textareaRef.current;

    // throttle nhẹ để khỏi giật/lag
    const now = Date.now();
    if (!force && now - lastFocusAtRef.current < 80) return;
    lastFocusAtRef.current = now;

    if (focusRafRef.current) cancelAnimationFrame(focusRafRef.current);
    focusRafRef.current = requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;

      node.focus({ preventScroll: true });

      // kéo caret về cuối
      const len = node.value?.length ?? 0;
      try {
        node.setSelectionRange(len, len);
      } catch (_) {}
    });
  },
  [hasRoom, showAddMembers]
);

  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const isNearBottomRef = useRef(true);

  const isNearBottom = (el, threshold = 140) => {
    if (!el) return true;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= threshold;
  };

  const scrollToBottom = useCallback((smooth = true) => {
    const el = chatWindowRef.current
    if (!el) return

    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    setShowJumpToBottom(false)
    isNearBottomRef.current = true
    focusInput(false)

    // ✅ mark seen ngay khi jump xuống đáy
    tryMarkSeen(true)
  }, [focusInput, tryMarkSeen])



  const handleReplyPick = useCallback((payload) => {

  
    if (!payload?.messageId) return

    setReplyDraft({
      messageId: payload.messageId,
      roomId: payload.roomId,
      replyToUserId: payload.senderId || null, // ✅
      senderName: payload.senderName || 'Unknown',
      content: payload.content || '',
      createdAt: payload.createdAt || '',
      messageType: payload.messageType || 'text',
      rawMsg: payload.rawMsg || null,
    })

    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [])


  useEffect(() => {
    // đổi room thì bỏ reply
    setReplyDraft(null)
  }, [selectedRoom?.id])


  

  useEffect(() => {
    return () => {
      if (focusRafRef.current) cancelAnimationFrame(focusRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!addFeedback) return;
    const t = setTimeout(() => setAddFeedback(null), 3000);
    return () => clearTimeout(t);
  }, [addFeedback]);

  const addFilesAsPendingImages = async (files) => {
    const arr = Array.from(files || []);
    const images = arr.filter((f) => f && f.type && f.type.startsWith('image/'));
    if (images.length === 0) return;

    const remaining = MAX_PENDING_IMAGES - pendingImages.length;
    if (remaining <= 0) return;

    const pick = images.slice(0, remaining);

    // ✅ nén trước khi đưa vào pending
    const compressed = await Promise.all(
      pick.map((file) =>
        compressImage(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.8,
          mimeType: 'image/webp', // hoặc 'image/jpeg'
        })
      )
    );

    setPendingImages((prev) => {
      const next = [...prev];

      for (const file of compressed) {
        if (next.length >= MAX_PENDING_IMAGES) break;

        const signature = `${file.name}_${file.size}_${file.lastModified}`;
        const existed = next.some(
          (p) =>
            p?.file &&
            `${p.file.name}_${p.file.size}_${p.file.lastModified}` === signature
        );
        if (existed) continue;

        next.push({
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          file,
          url: URL.createObjectURL(file),
        });
      }

      return next;
    });
  };


  const handlePickImages = () => {
    if (!hasRoom) return;
    if (fileInputRef.current) fileInputRef.current.click();
    focusInput(); // ✅ mở picker xong vẫn ưu tiên quay về input
  };

  const handleFileSelected = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) await addFilesAsPendingImages(files);
    e.target.value = '';
    focusInput(true);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    if (pendingImages.length >= MAX_PENDING_IMAGES) return;

    const images = [];
    for (const it of items) {
      if (it && it.type && it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) images.push(file);
      }
    }

    if (images.length > 0) {
      e.preventDefault();
      await addFilesAsPendingImages(images);
      focusInput(true);
    }
  };


  const removePendingImage = (id) => {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
    focusInput();
  };

  // cleanup blob urls khi unmount
  useEffect(() => {
    return () => {
      pendingImages.forEach((p) => {
        if (p?.url) URL.revokeObjectURL(p.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⭐ Fetch member list và dùng để filter add-member
  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedRoom || !RoomMembers) return;
      try {
        const res = await RoomMembers(selectedRoom.id);
        setMembersInRooms(res || []);
      } catch (err) {
        console.error('Failed to fetch room members:', err);
      }
    };
    fetchMembers();
  }, [selectedRoom, RoomMembers]);

  const localFilteredAddUsers = useMemo(() => {
    const keyword = searchUserAdd.trim().toLowerCase();
    const memberIds = new Set((membersInRooms || []).map((m) => Number(m.user_id)));

    const base = listUsers.filter((u) => {
      if (!u) return false;
      if (Number(u.id) === Number(currentUserId)) return false;
      if (memberIds.has(Number(u.id))) return false;
      return true;
    });

    if (!keyword) return base;

    return base.filter((u) => {
      const username = (u.username || '').toLowerCase();
      const fullName = (u.full_name || '').toLowerCase();
      return username.includes(keyword) || fullName.includes(keyword);
    });
  }, [listUsers, searchUserAdd, currentUserId, membersInRooms]);

  const filteredAddUsers =
    remoteAddUsers.length > 0 ? remoteAddUsers : localFilteredAddUsers;

  useEffect(() => {
    const keyword = searchUserAdd.trim();
    if (!keyword) {
      setRemoteAddUsers([]);
      return;
    }

    if (localFilteredAddUsers.length > 0) {
      setRemoteAddUsers([]);
      return;
    }
    if (!onSearchUsers) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await onSearchUsers(keyword);
        const list = Array.isArray(res) ? res : res?.users;

        if (cancelled || !Array.isArray(list)) {
          setRemoteAddUsers([]);
          return;
        }

        const memberIds = new Set((membersInRooms || []).map((m) => Number(m.user_id)));

        const cleaned = list.filter((u) => {
          if (!u) return false;
          if (Number(u.id) === Number(currentUserId)) return false;
          if (memberIds.has(Number(u.id))) return false;
          return true;
        });

        setRemoteAddUsers(cleaned);
      } catch (err) {
        if (!cancelled) setRemoteAddUsers([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchUserAdd, localFilteredAddUsers, onSearchUsers, currentUserId, membersInRooms]);

  useEffect(() => {
    if (!hasRoom) return;
    if (loadingMessages) return;
    if (messageError) return;
    if (!messages || messages.length === 0) return;

    const chatEl = chatWindowRef.current;

    // ✅ nếu vừa load older -> giữ vị trí như cũ
    if (loadingOlderRef.current && chatEl) {
      const { scrollHeight: prevH, scrollTop: prevTop } = prevScrollInfoRef.current || {};
      const newH = chatEl.scrollHeight;

      if (prevH != null && prevH > 0 && prevTop != null) {
        chatEl.scrollTop = newH - prevH + prevTop;
      }

      loadingOlderRef.current = false;
      return;
    }

    // ✅ chỉ auto-scroll nếu user đang gần đáy
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      setShowJumpToBottom(false);
    } else {
      setShowJumpToBottom(true);
    }
  }, [hasRoom, loadingMessages, messageError, messages]);

  // useEffect(() => {
  //   if (!hasRoom) return;
  //   // đổi room thì auto xuống đáy luôn
  //   requestAnimationFrame(() => scrollToBottom(false));
  // }, [hasRoom, selectedRoom?.id, scrollToBottom]);


  // ====== AUTO RESIZE TEXTAREA ======
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = '40px';
    const maxHeight = 160;
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
  }, [inputValue]);

  // ✅ FIX: focus theo lifecycle “đúng”, không spam theo messages.length
  const canType = hasRoom && !loadingMessages && !messageError;
  const sendingLocked = isSending || isUploadingImages;

  useLayoutEffect(() => {
    if (!hasRoom) return;
    if (!canType) return;
    if (showAddMembers) return;

    // khi đổi room / unlock sending / render xong -> focus lại chắc
    focusInput(true);
  }, [hasRoom, selectedRoom?.id, canType, sendingLocked, showAddMembers, focusInput]);


  const applyRealtimeRoomName = useCallback(
    async (roomId, roomObj, currentRoomId) => {
      if (!roomId || !roomObj) return

      const r = roomObj
      const type = String(r?.type || '').toLowerCase()

      const patch = {
        type: r?.type,
        updated_at: r?.updated_at,
      }

      // =========================
      // ✅ DIRECT ROOM
      // =========================
      if (type === 'direct') {
        try {
          const res = await getDirectPartnerName(roomId)
          const partnerName =
            res?.full_name ||
            res?.name ||
            res?.displayName ||
            'Direct chat'

          patch.displayName = partnerName
          // ❌ KHÔNG set patch.name để khỏi đè raw name kiểu direct_12_34
        } catch (err) {
          console.warn('[applyRealtimeRoomName] direct-name failed', err)
          return
        }
      }

      // =========================
      // ✅ GROUP ROOM
      // =========================
      else {
        const name = (r?.name || r?.displayName || '').trim()
        if (!name) return

        patch.name = name
        patch.displayName = name
      }

      if (typeof window.__updateRoomSidebar === 'function') {
        window.__updateRoomSidebar(roomId, patch, currentRoomId)
      }
    },
    []
  )



  // ====== WEBSOCKET GLOBAL ======
  useEffect(() => {
    if (!setMessages) return;

    // Prefer an explicit ws base; otherwise fall back to the page origin so the
    // socket goes to the same host that serves the app (nginx then proxies /ws
    // to the backend). Same-origin is required for the refresh_token cookie.
    const wsBase =
      import.meta.env.VITE_WS_BASE_URL ||
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

    const wsUrl = `${wsBase}/ws`; // bỏ token
    const ws = new WebSocket(wsUrl);

    wsRef.current = ws;


    ws.onopen = () => {
    };

    ws.onmessage = (event) => {
      try {
        const env = JSON.parse(event.data)

        // ✅ normalize envelope: support both {type,room_id,data} & {Type,RoomID,Data}
        const type = env?.type || env?.Type
        const roomId = env?.room_id || env?.RoomID
        const data = env?.data || env?.Data

        if (!type) return

        const currentRoomId = selectedRoomRef.current?.id

        switch (type) {
          case 'message_created': {
            // ✅ ONLY kiểu 2
            const msg = data?.message
            const room = data?.room
            if (!msg || msg.id == null) return

            const cur = selectedRoomRef.current?.id
            const isCurrent = cur != null && Number(roomId) === Number(cur)

            // ✅ realtime update tên room từ room_lite
            if (room) {
              applyRealtimeRoomName(roomId, room, cur)
            }

            // ✅ ALWAYS update sidebar meta + last message
            if (typeof window.__updateRoomSidebar === 'function') {
              window.__updateRoomSidebar(
                roomId,
                {
                  last_message: msg,
                  last_message_at: msg?.created_at || new Date().toISOString(),
                  updated_at: msg?.created_at || new Date().toISOString(),
                  bump_unread: !isCurrent,
                  // optional: cũng có thể nhét room vào đây nếu sidebar function mày handle
                  // room: room,
                },
                cur
              )
            }

            if (typeof onRealtimeMessage === 'function') onRealtimeMessage(msg)

            if (!isCurrent) return

            setMessages(prev => {
              const arr = prev || []
              if (arr.length && Number(arr[arr.length - 1]?.id) === Number(msg.id)) return arr
              const existingIds = new Set(arr.map(m => m.id))
              if (existingIds.has(msg.id)) return arr
              return [...arr, msg]
            })

            return
          }

          // case 'room_updated': {
          //   if (!roomId) return
          //   const payload = data || {}

          //   // ✅ hydrate room name nếu BE có gửi payload.room
          //   if (payload?.room) {
          //     applyRealtimeRoomName(roomId, payload.room, currentRoomId)
          //   }

          //   if (typeof window.__updateRoomSidebar === 'function') {
          //     window.__updateRoomSidebar(roomId, payload, currentRoomId)
          //   }

          //   return
          // }

          case 'room_deleted': {
            if (typeof window.__removeRoomSidebar === 'function') {
              window.__removeRoomSidebar(roomId)
            }
            return
          }

          case 'room.member_removed': {
            const removedId = data?.user_id
            if (selectedRoomRef.current?.id === roomId) {
              if (typeof RoomMembers === 'function') {
                RoomMembers(roomId)
                  .then((res) => setMembersInRooms(res || []))
                  .catch(() => {})
              } else {
                setMembersInRooms((prev) =>
                  (prev || []).filter((m) => Number(m.user_id) !== Number(removedId))
                )
              }
            }
            return
          }

          case 'room.member_added': {
            if (selectedRoomRef.current?.id === roomId && typeof RoomMembers === 'function') {
              RoomMembers(roomId)
                .then((res) => setMembersInRooms(res || []))
                .catch(() => {})
            }
            return
          }
          
          case 'room.joined': {
                const room = data?.room
                if (!room || room.id == null) return

                // add sidebar
                if (typeof window.__addRoomSidebar === 'function') {
                  window.__addRoomSidebar(room)
                }

                // hydrate direct name theo roomId từ envelope (chuẩn nhất)
                if (String(room?.type).toLowerCase() === 'direct') {
                  Promise.resolve()
                    .then(async () => {
                      const r = await getDirectPartnerName(roomId ?? room.id)
                      const partnerName =
                        r?.full_name || r?.name || room.displayName || room.name || 'Direct chat'

                      if (typeof window.__updateRoomSidebar === 'function') {
                        window.__updateRoomSidebar(room.id, { displayName: partnerName })
                      }
                    })
                    .catch(() => {})
                }

                return
              }

          case 'reaction_updated': {
            const payload = data || {}
            const msgId = payload.message_id
            const reactions = payload.reactions
            if (!msgId) return

            if (!currentRoomId || Number(roomId) !== Number(currentRoomId)) return

            setMessages((prev) =>
              (prev || []).map((m) =>
                Number(m.id) === Number(msgId)
                  ? { ...m, reactions: Array.isArray(reactions) ? reactions : [] }
                  : m
              )
            )
            return
          }

          case 'room_seen_update': {
            if (!roomId) return

            const payload = data || {}

            // ✅ chỉ update seen state
            upsertRoomSeen(roomId, payload)

            return
          }

          case 'rooms_sync': {
            // BE: Data = { rooms: RoomInfoResponse[] }
            const payload = data || {}
            const incoming = Array.isArray(payload) ? payload : (payload?.rooms || [])
            if (!Array.isArray(incoming)) return

            // ✅ BE đã override name cho direct => FE ưu tiên dùng name làm displayName
            const normalized = incoming
              .filter(r => r && r.id != null)
              .map((r) => {
                const type = String(r?.type || '').toLowerCase()
                const name = String(r?.name || '').trim()

                return {
                  ...r,
                  type,
                  // ✅ displayName luôn có giá trị để sidebar render ổn
                  displayName:
                    String(r?.displayName || '').trim() ||
                    name ||
                    (type === 'direct' ? 'Direct chat' : 'Group'),
                }
              })

            // ✅ Ưu tiên setRoomsSidebar merge (đỡ ghi đè state local như unread/seen nếu BE chưa kèm)
            if (typeof window.__setRoomsSidebar === 'function') {
              window.__setRoomsSidebar(normalized, { merge: true })
              return
            }

            // fallback: add + update từng room
            if (typeof window.__addRoomSidebar === 'function') {
              normalized.forEach((r) => window.__addRoomSidebar(r))
            }
            if (typeof window.__updateRoomSidebar === 'function') {
              normalized.forEach((r) => window.__updateRoomSidebar(r.id, r))
            }

            return
          }

        // case "room_unread_update": {
        //   const payload = data || {}
        //   const rid = Number(payload?.room_id || roomId)
        //   if (!rid) return

        //   if (typeof window.__updateRoomSidebar === "function") {
        //     window.__updateRoomSidebar(rid, {
        //       unread_count: Number(payload.unread_count) || 0,
        //       // optional: update updated_at/last_message nếu mày muốn bump sort
        //       // updated_at: new Date().toISOString(),
        //       // last_message: payload.last_message,
        //     })
        //   }

        //   return
        // }

              default:
                return
            }
          } catch (err) {
            console.error('WS parse error', err)
          }
        }


      const RS = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']

      ws.onopen = () => {
        console.log('[WS] open', { url: wsUrl, state: RS[ws.readyState] })
      }

      ws.onerror = (e) => {
        console.log('[WS] error', {
          url: wsUrl,
          state: RS[ws.readyState],
          event: { type: e?.type, timeStamp: e?.timeStamp },
        })
      }

      ws.onclose = (e) => {
        console.log('[WS] close', {
          url: wsUrl,
          state: RS[ws.readyState],
          code: e?.code,
          reason: e?.reason,
          wasClean: e?.wasClean,
        })
      }


    return () => {
      wsRef.current?.close();
    };
}, [setMessages, onRealtimeMessage, RoomMembers, upsertRoomSeen]);

  const sendSystemMessage = useCallback(async (text) => {
    if (!selectedRoom?.id) return
    if (typeof onSendMessage !== 'function') return
    const content = String(text || '').trim()
    if (!content) return
    await onSendMessage(selectedRoom.id, content, 'system', null)
  }, [selectedRoom?.id, onSendMessage])

  // ==========================
  // ✅ SEND (text + images)
  // ==========================
  const handleSend = async () => {
    if (!hasRoom) return;

    const trimmed = inputValue.trim();
    const hasText = trimmed.length > 0;
    const hasImages = pendingImages.length > 0;

    if (!hasText && !hasImages) return;
    if (isSending || isUploadingImages) return;

    try {
      setIsSending(true);

      // ==========================
      // 1) UPLOAD IMAGES → INSERT MESSAGE
      // ==========================
      if (hasImages) {
        if (typeof onUploadRoomImages !== 'function') {
        } else if (typeof onSendMessage !== 'function') {
        } else {
          setIsUploadingImages(true);

          // compress trước khi upload
          const files = await Promise.all(
            pendingImages.map((p) =>
              compressImage(p.file, {
                maxWidth: 1280,
                maxHeight: 1280,
                quality: 0.8,
                mimeType: 'image/webp',
              })
            )
          );


          // ✅ expect onUploadRoomImages return: { media_urls: string[] }
          const uploadRes = await onUploadRoomImages({
            roomId: selectedRoom.id,
            files,
          });


          const mediaUrls = uploadRes?.media_urls || [];
          if (mediaUrls.length === 0) {
            console.warn('⚠️ Upload ok but missing media_urls:', uploadRes);
          } else {
            for (const url of mediaUrls) {
              await onSendMessage(selectedRoom.id, url, 'image');
            }
          }

          // clear pending images
          pendingImages.forEach((p) => p?.url && URL.revokeObjectURL(p.url));
          setPendingImages([]);
        }
      }

      const replyToMessageId = replyDraft?.messageId || null
      const replyToUserId = replyDraft?.replyToUserId || null


      // ==========================
      // 2) SEND TEXT
      // ==========================
      if (hasText) {
        if (typeof onSendMessage !== 'function') {
        } else {
          await onSendMessage(selectedRoom.id, trimmed, 'text', replyToMessageId);
        }
      }

      setReplyDraft(null) // ✅ clear reply when send succeeds

      setInputValue('');
      focusInput(true);
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setIsSending(false);
      setIsUploadingImages(false);
    }
  };

  const handleKeyDown = (e) => {
    // ✅ nếu đang mở emoji suggestion: ưu tiên điều khiển nó
    if (emojiSuggest.open && emojiSuggest.items.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setEmojiSuggest(s => ({
          ...s,
          active: (s.active - 1 + s.items.length) % s.items.length,
        }))
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setEmojiSuggest(s => ({
          ...s,
          active: (s.active + 1) % s.items.length,
        }))
        return
      }

      if (e.key === 'Enter') {
        // Enter lúc này là CHỌN emoji, không send
        e.preventDefault()
        const pick = emojiSuggest.items[emojiSuggest.active]
        applyEmojiSuggestion(pick)
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        closeEmojiSuggest()
        return
      }
    }

    // ✅ bình thường: Enter gửi
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const trimmed = inputValue.trim();
  const canSend =
    hasRoom &&
    canType &&
    !sendingLocked &&
    (trimmed.length > 0 || pendingImages.length > 0);

  // ===== SCROLL HANDLER: LOAD OLDER =====
  const handleScrollMessages = () => {
    const el = chatWindowRef.current;
    if (!el) return;

    // ✅ update trạng thái đang ở gần đáy hay không
    const nearBottom = isNearBottom(el);
    isNearBottomRef.current = nearBottom;
    setShowJumpToBottom(!nearBottom);

    // ====== phần load older giữ nguyên logic ======
    if (!hasRoom) return;
    if (!onLoadOlderMessages) return;
    if (!messages || messages.length === 0) return;
    if (!hasMoreMessages) return;

    if (loadingMessages || loadingOlderMessages || loadingOlderRef.current) return;

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    scrollTimeoutRef.current = setTimeout(async () => {
      const threshold = 50;

      if (el.scrollTop <= threshold) {
        const oldest = messages[0];
        if (!oldest || oldest.id == null) return;

        loadingOlderRef.current = true;
        prevScrollInfoRef.current = {
          scrollHeight: el.scrollHeight,
          scrollTop: el.scrollTop,
        };

        try {
          await onLoadOlderMessages(oldest.id);
        } catch (err) {
          console.error('Load older messages error:', err);
          loadingOlderRef.current = false;
        }
      }
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // ===== HANDLER MINI UI ADD MEMBER =====
  const handleOpenAddMembers = () => {
    if (!selectedRoom) return;
    setSearchUserAdd('');
    setSelectedUserIds(new Set());
    setRemoteAddUsers([]);
    setAddFeedback(null);
    setShowAddMembers(true);
    setShowConfirmAdd(false);
  };

  const handleCancelAddMembers = () => {
    setShowAddMembers(false);
    setShowConfirmAdd(false);
    setRemoteAddUsers([]);
    setAddFeedback(null);

    // ✅ đóng modal xong thì focus lại
    focusInput(true);
  };

  const handleToggleAddUser = (userId) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleConfirmAddMembers = async () => {
    if (!selectedRoom) return;

    const memberIds = Array.from(selectedUserIds);
    if (memberIds.length === 0) {
      setAddFeedback({
        type: 'error',
        text: 'Please select at least one member 😏',
      });
      return;
    }

    const roomName =
      selectedRoom.displayName || selectedRoom.name || `Room #${selectedRoom.id}`;

    try {
      setIsAddingMembers(true);

      if (typeof onAddMembersToRoom === 'function') {
        await onAddMembersToRoom({
          roomId: selectedRoom.id,
          member_ids: memberIds,
        });
        // build tên cho đẹp
          const addedUsers = (filteredAddUsers || [])
            .filter(u => memberIds.includes(u.id))
            .map(u => u.full_name || u.username || `User #${u.id}`)

          // fallback nếu list đang là remote/local khác nhau
          const names = addedUsers.length > 0
            ? addedUsers.join(', ')
            : memberIds.map(id => `User #${id}`).join(', ')

          await sendSystemMessage(`👥 Added ${memberIds.length} member(s): ${names}`)

      } else {
        console.log('Add members payload:', {
          roomId: selectedRoom.id,
          member_ids: memberIds,
        });
      }
            
      // ✅ reload members để popup Members update + filter add list đúng
      if (typeof RoomMembers === 'function') {
        try {
          const res = await RoomMembers(selectedRoom.id);
          setMembersInRooms(res || []);
        } catch (e) {
          console.error('Reload members after add failed:', e);
        }
      }

      // ✅ cực quan trọng: clear remoteAddUsers để UI quay về localFilteredAddUsers
      setRemoteAddUsers([]);


      setAddFeedback({
        type: 'success',
        text: `Added ${memberIds.length} member(s) to "${roomName}".`,
      });

      setShowConfirmAdd(false);
      setSelectedUserIds(new Set());
      setSearchUserAdd('');
      setRemoteAddUsers([]);
    } catch (err) {
      console.error('Add members error:', err);
      setAddFeedback({
        type: 'error',
        text: 'Failed to add members. Please try again.',
      });
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (typeof onDeleteRoom === 'function') {
      await onDeleteRoom(roomId);
    }
  };

  function applyToggleReactionLocal(reactions = [], reactionKey, added) {
    const arr = Array.isArray(reactions) ? [...reactions] : [];
    const idx = arr.findIndex((x) => String(x?.reaction) === String(reactionKey));

    if (idx === -1) {
      if (added) {
        arr.push({ reaction: reactionKey, count: 1, reacted_by_me: true });
      }
      return arr;
    }

    const cur = arr[idx] || {};
    const count = Number(cur.count) || 0;

    const nextCount = added ? count + 1 : count - 1;
    const next = {
      ...cur,
      reaction: reactionKey,
      count: Math.max(0, nextCount),
      reacted_by_me: added ? true : false,
    };

    if (next.count <= 0) {
      arr.splice(idx, 1);
    } else {
      arr[idx] = next;
    }

    return arr;
  }


  // ví dụ: import { toggleReaction } from '../services/chatService';

  const handleReactMessage = useCallback(async (payload) => {
    const messageId = payload?.messageId;
    const reactionKey = payload?.reaction;
    if (!messageId || !reactionKey) return;

    let optimisticAdded = null;

    // optimistic
    setMessages((prev) =>
      (prev || []).map((m) => {
        if (Number(m.id) !== Number(messageId)) return m;

        const list = Array.isArray(m.reactions) ? m.reactions : [];
        const existed = list.find((x) => String(x?.reaction) === String(reactionKey));
        const me = !!existed?.reacted_by_me;

        optimisticAdded = !me;

        return {
          ...m,
          reactions: applyToggleReactionLocal(list, reactionKey, optimisticAdded),
        };
      })
    );

    try {
      const resp = await toggleReaction(messageId, reactionKey); // { added: boolean }

      // ✅ nếu BE trả đúng như optimistic thì thôi, đừng apply lần 2
      if (resp && typeof resp.added === 'boolean' && resp.added !== optimisticAdded) {
        setMessages((prev) =>
          (prev || []).map((m) => {
            if (Number(m.id) !== Number(messageId)) return m;

            // ⚠️ lúc này m.reactions đang là state sau optimistic
            // nên muốn sửa lệch thì "đảo lại" 1 lần là đủ:
            return {
              ...m,
              reactions: applyToggleReactionLocal(m.reactions, reactionKey, resp.added),
            };
          })
        );
      }
    } catch (e) {
      console.error('toggleReaction failed', e);
      // rollback: đảo lại optimistic 1 lần
      if (optimisticAdded != null) {
        setMessages((prev) =>
          (prev || []).map((m) => {
            if (Number(m.id) !== Number(messageId)) return m;
            return {
              ...m,
              reactions: applyToggleReactionLocal(m.reactions, reactionKey, !optimisticAdded),
            };
          })
        );
      }
    }
  }, [setMessages]);

  function dayKey(d) {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
    }

  function formatDayLabel(d) {
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return '';

    const HOURS_OFFSET = 7;
    const fixed = new Date(dt);
    fixed.setHours(fixed.getHours() - HOURS_OFFSET);

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(fixed);
  }


  const latestMyMessageId = useMemo(() => {
    const arr = Array.isArray(messages) ? messages : []
    for (let i = arr.length - 1; i >= 0; i--) {
      const m = arr[i]
      if (Number(m?.sender_id) === Number(currentUserId) && m?.id) return Number(m.id)
    }
    return 0
  }, [messages, currentUserId])

  const seenUsersForLatestMyMsg = useMemo(() => {
    const rid = String(selectedRoom?.id || '')
    const room = roomSeenMap[rid] || {}
    const list = Object.values(room)

    const meId = Number(currentUserId)
    const targetId = Number(latestMyMessageId)

    // ✅ filter: seen tới latest my msg + exclude me + dedupe theo user_id
    const mp = new Map()
    for (const u of list) {
      if (!u) continue
      const uid = Number(u.user_id)
      if (!uid || uid === meId) continue
      if (Number(u.last_seen_message_id || 0) < targetId) continue
      if (!mp.has(uid)) mp.set(uid, u)
    }

    return Array.from(mp.values())
  }, [roomSeenMap, selectedRoom?.id, latestMyMessageId, currentUserId])


  useLayoutEffect(() => {
    if (!hasRoom) return
    if (!isNearBottomRef.current) return

    // seen thay đổi làm tăng height -> kéo xuống lại
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
    })
  }, [
    hasRoom,
    selectedRoom?.id,
    latestMyMessageId,
    seenUsersForLatestMyMsg.length, // hoặc seenCount
  ])

  // ====== RENDER ======
  if (loadingRooms) {
    return (
      <>
        <div className="chat-header">
          <div>
            <h2 className="chat-title">Loading chat rooms...</h2>
            <p className="chat-subtitle">
              Please wait while CronChat fetches the room list 😄
            </p>
          </div>
        </div>

        <div
          className="chat-window cc-scroll"
        >
          <div className="chat-empty">
            <p>Loading room data...</p>
          </div>
        </div>
      </>
    );
  }

  if (roomError) {
    return (
      <>
        <div className="chat-header">
          <div>
            <h2 className="chat-title">Failed to load rooms</h2>
            <p className="chat-subtitle" style={{ color: 'red' }}>
              {roomError}
            </p>
          </div>
        </div>

        <div
          className="chat-window cc-scroll"

        >
          <div className="chat-empty">
            <p>Please double-check the API/backend, bro.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="cc-chat-layout">
      {/* HEADER */}
      <ChatMainHeader
        hasRoom={hasRoom}
        selectedRoom={selectedRoom}
        onOpenAddMembers={handleOpenAddMembers}
        membersInRooms={membersInRooms}
        currentUserId={currentUserId}
        handleDeleteRoom={handleDeleteRoom}
        onSendSystem={sendSystemMessage}

          // ✅ ADD THIS
        onMemberRemoved={(removedId) => {
          setMembersInRooms((prev) =>
            (prev || []).filter((m) => Number(m.user_id) !== Number(removedId))
          )
        }}
      />

      {/* KHUNG CHAT CHÍNH */}
      <div className="chat-window-wrap">
        <div
          className="chat-window cc-scroll"
          ref={chatWindowRef}
          onScroll={handleScrollMessages}

          onMouseDown={(e) => {
            const noFocus = e.target.closest(
              '.message-bubble, .message-images, .message-image-btn, .img-preview-overlay, .img-preview-modal'
            );
            if (noFocus) return;
            focusInput(false);
          }}
        >

        {!hasRoom && (
          <div className="chat-empty">
            <p>Select a room from the right sidebar to start chatting.</p>
          </div>
        )}

        {hasRoom && (
          <>
            {loadingMessages && (
              <div className="chat-empty">
                <p>Loading messages...</p>
              </div>
            )}

            {!loadingMessages && messageError && (
              <div className="chat-empty">
                <p style={{ color: 'red' }}>Error: {messageError}</p>
              </div>
            )}

            {!loadingMessages && !messageError && messages.length === 0 && (
              <div className="chat-empty">
                <p>There are no messages in this room yet. Be the first 😎</p>
              </div>
            )}

            {!loadingMessages && !messageError && messages.length > 0 && (
              <div className="message-list">
                {loadingOlderMessages && (
                  <div className="chat-older-loading">Loading older messages...</div>
                )}

                {messages.map((msg, idx) => {
                  const key =
                    msg?.id ??
                    msg?.client_id ??
                    msg?.temp_id ??
                    msg?.local_id ??
                    `${msg?.sender_id || 'u'}_${msg?.created_at || 't'}_${idx}`

                  return (
                    <Fragment key={key}>
                      <ChatMessageItem
                        msg={msg}
                        currentUserId={currentUserId}
                        formatTime={formatTime}
                        onReactMessage={handleReactMessage}
                        onReplyMessage={handleReplyPick}
                        isLatestMyMessage={Number(msg.id) === Number(latestMyMessageId)}
                        seenUsers={Number(msg.id) === Number(latestMyMessageId) ? seenUsersForLatestMyMsg : []}
                        seenCount={Number(msg.id) === Number(latestMyMessageId) ? seenUsersForLatestMyMsg.length : 0}
                      />
                    </Fragment>
                  )
                })}


                <div ref={messagesEndRef} />
              </div>
            )}



          </>
        )}
      </div>
        {hasRoom && showJumpToBottom && (
          <button
            type="button"
            className="jump-bottom-btn jump-bottom-btn-floating"
            onClick={() => scrollToBottom(true)}
            title="Go to latest message"
          >
            ⬇
          </button>
        )}
      </div>

      {/* ========= INPUT BAR (text + images) ========= */}
      <div className="chat-input-bar cc-scroll">
        {/* hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />

        {/* button upload ảnh */}
        <button
          type="button"
          className="chat-upload-btn"
          onClick={handlePickImages}
          disabled={
            !hasRoom ||
            !canType ||
            sendingLocked ||
            pendingImages.length >= MAX_PENDING_IMAGES
          }
          title={
            pendingImages.length >= MAX_PENDING_IMAGES
              ? `Max ${MAX_PENDING_IMAGES} images`
              : 'Upload image'
          }
        >
          🖼️
        </button>

        <div className="chat-input-wrap">

          {replyDraft && (
            <div className="chat-reply-bar">
              <div className="chat-reply-left">
                <span className="chat-reply-icon">↩</span>
                <div className="chat-reply-info">
                  <div className="chat-reply-title">
                    Replying to <b>{replyDraft.senderName}</b>
                  </div>
                  <div className="chat-reply-snippet">
                    {replyDraft.messageType === 'image'
                      ? '📷 Image'
                      : (replyDraft.content || '').trim() || '...'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="chat-reply-cancel"
                onClick={() => setReplyDraft(null)}
                disabled={sendingLocked}
                title="Cancel reply"
              >
                ✕
              </button>
            </div>
          )}


          {/* preview ảnh đang pending */}
          {pendingImages.length > 0 && (
            <div className="chat-image-preview-strip">
              {pendingImages.map((p) => (
                <div key={p.id} className="chat-image-preview-item">
                  <img src={p.url} alt="preview" />
                  <button
                    type="button"
                    className="chat-image-remove-btn"
                    onClick={() => removePendingImage(p.id)}
                    disabled={sendingLocked}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <EmojiPicker
              disabled={!canType || sendingLocked}
              onPick={insertAtCaret}
            />
            {emojiSuggest.open && emojiSuggest.items.length > 0 && (
              <div className="emoji-suggest">
                {/* <div className="emoji-suggest-hint">
                  ↑/↓ chọn • Enter apply • Esc đóng
                </div> */}

                {emojiSuggest.items.map((it, idx) => (
                  <button
                    key={it.key}
                    type="button"
                    className={
                      'emoji-suggest-item' + (idx === emojiSuggest.active ? ' active' : '')
                    }
                    onMouseDown={(ev) => {
                      // onMouseDown để khỏi mất focus/caret
                      ev.preventDefault()
                      applyEmojiSuggestion(it)
                    }}
                    title={it.key}
                  >
                    <span className="emoji-suggest-emoji">{it.emoji}</span>
                    <span className="emoji-suggest-key">{it.key}</span>
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              className="chat-input cc-scroll"
              placeholder={
                hasRoom
                  ? 'Type a message...'
                  : 'Please select a room before sending a message...'
              }
              // ✅ FIX: chỉ disable khi không được chat (no room/load/error)
              disabled={!canType}
              // ✅ FIX: khi đang gửi thì READONLY, đừng DISABLED → không rớt focus
              readOnly={sendingLocked}
              value={inputValue}
              onChange={handleInputChange}

            onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              // onBlur={() => focusInput(false)} // ✅ lỡ mất focus thì kéo lại (không force)
              rows={1}
              style={{
                resize: 'none',
                overflowY: 'auto',
              }}
            />
            </div>
        </div>

        {/* send */}
        {/* <button
          type="button"
          className={'chat-send-btn' + (canSend ? ' chat-send-btn-active' : '')}
          onClick={handleSend}
          disabled={!canSend}
          title="Send"
        >
          {isUploadingImages ? 'Uploading...' : isSending ? 'Sending...' : '➤'}
        </button> */}
      </div>

      {/* MINI UI ADD MEMBERS */}
      {showAddMembers && (
        <div className="create-group-overlay">
          <div className="create-group-modal">
            <div className="create-group-header">
              <div className="create-group-title">Add members to group</div>
              <button
                type="button"
                className="create-group-close-btn"
                onClick={handleCancelAddMembers}
                disabled={isAddingMembers}
              >
                ×
              </button>
            </div>

            {addFeedback && (
              <div
                className={
                  'feedback-message ' +
                  (addFeedback.type === 'error'
                    ? 'feedback-error'
                    : 'feedback-success')
                }
                style={{ marginTop: '8px', marginBottom: '4px' }}
              >
                {addFeedback.text}
              </div>
            )}

            <div className="create-group-body">
              <div className="form-field">
                <label className="form-label">
                  Members{' '}
                  <span className="form-label-sub">
                    ({selectedUserIds.size} selected)
                  </span>
                </label>

                <input
                  type="text"
                  className="form-input-search"
                  value={searchUserAdd}
                  onChange={(e) => setSearchUserAdd(e.target.value)}
                  placeholder="Search by name or username…"
                />

                <div className="create-group-user-list">
                  {filteredAddUsers.length === 0 && (
                    <div className="user-empty-text">No users found</div>
                  )}

                  {filteredAddUsers.map((u) => {
                    if (!u) return null;

                    const isSelected = selectedUserIds.has(u.id);

                    const displayName = u.full_name || u.username || `User #${u.id}`;
                    const letter = (displayName && displayName[0].toUpperCase()) || '?';

                    const safeAvatarUrl = buildAvatarUrl(u.avatar_url);

                    return (
                      <button
                        key={u.id}
                        type="button"
                        className={
                          'create-group-user-item' +
                          (isSelected ? ' create-group-user-item-selected' : '')
                        }
                        onClick={() => handleToggleAddUser(u.id)}
                      >
                        <div className="user-avatar-circle">
                          {safeAvatarUrl ? (
                            <img src={safeAvatarUrl} alt={displayName} loading="lazy" />
                          ) : (
                            <span>{letter}</span>
                          )}
                        </div>

                        <div className="user-info">
                          <div className="user-fullname">{displayName}</div>
                          <div className="user-username">
                            @{u.username || `user_${u.id}`}
                          </div>
                        </div>

                        <div className="user-check">{isSelected ? '✓' : ''}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="create-group-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancelAddMembers}
                disabled={isAddingMembers}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowConfirmAdd(true)}
                disabled={isAddingMembers || selectedUserIds.size === 0}
              >
                Add members
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP CONFIRM ADD MEMBERS */}
      {showAddMembers && showConfirmAdd && (
        <div
          className="confirm-remove-overlay"
          onClick={() => !isAddingMembers && setShowConfirmAdd(false)}
        >
          <div className="confirm-remove-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-remove-title">Add members to group?</div>

            <div className="confirm-remove-text">
              You are about to add <strong>{selectedUserIds.size}</strong> member(s) to{' '}
              <strong>
                {selectedRoom?.displayName ||
                  selectedRoom?.name ||
                  `Room #${selectedRoom?.id}`}
              </strong>
              . Do you want to continue?
            </div>

            <div className="confirm-remove-actions">
              <button
                className="confirm-remove-cancel-btn"
                onClick={() => setShowConfirmAdd(false)}
                disabled={isAddingMembers}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmAddMembers}
                disabled={isAddingMembers}
              >
                {isAddingMembers ? 'Adding...' : 'Yes, add members'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatMain;
