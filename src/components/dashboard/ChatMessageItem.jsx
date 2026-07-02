import React, { useMemo, useState, useCallback } from 'react'
import buildImageUrl from '../../utils/imageHandle.js'
import ImagePreviewModal from './ImagePreviewModal.jsx'
import MessageContextMenu from './MessageContextMenu.jsx'

const REACT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢']

// keyword (BE) <-> emoji (FE)
const REACTION_KEY_TO_EMOJI = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
}

const REACTION_EMOJI_TO_KEY = {
  '👍': 'like',
  '❤️': 'love',
  '😂': 'laugh',
  '😮': 'wow',
  '😢': 'sad',
}

function ChatMessageItem({
  msg,
  currentUserId,
  formatTime,

  onReactMessage,
  onReplyMessage,

  // ✅ NEW: seen
  isLatestMyMessage = false,
  seenUsers = [], // [{user_id, full_name, avatar_url, last_seen_message_id, last_seen_at}]
  seenCount = null,
}) {
  // ✅ avoid breaking hooks order if msg is sometimes null
  const safeMsg = msg || {}

  const messageType = safeMsg.message_type || safeMsg.type
  const isSystem = messageType === 'system'
  const isTemp = !!safeMsg.is_temp

  const isMe =
    currentUserId != null &&
    safeMsg.sender_id != null &&
    Number(safeMsg.sender_id) === Number(currentUserId)

  const hasReply = !!safeMsg.reply?.message_id

  // ================================
  // ✅ NEW: day divider system message (0h UTC+7)
  // DB content format: '--- 2025-12-18 ---'
  // ================================
  const isDayDivider = useMemo(() => {
    if (!isSystem) return false

    // ✅ ưu tiên field explicit từ BE (nếu sau này có)
    if (safeMsg?.system_kind === 'day_change') return true
    if (safeMsg?.system_type === 'day_change') return true
    if (safeMsg?.system_event === 'day_change') return true

    // ✅ strict check theo format DB hiện tại
    const c = typeof safeMsg?.content === 'string'
      ? safeMsg.content.trim()
      : ''

    if (!c) return false

    // --- YYYY-MM-DD ---
    return /^---\s*\d{4}-\d{2}-\d{2}\s*---$/.test(c)
  }, [
    isSystem,
    safeMsg?.system_kind,
    safeMsg?.system_type,
    safeMsg?.system_event,
    safeMsg?.content,
  ])

  // ================================
  // ✅ system class
  // ================================
  const sysClass = useMemo(() => {
    if (!isSystem) return ''
    const c = typeof safeMsg.content === 'string' ? safeMsg.content : ''
    if (isDayDivider) return 'sys-day'
    if (c.includes('👥')) return 'sys-add'
    if (c.includes('🚫')) return 'sys-remove'
    if (c.includes('✏️')) return 'sys-rename'
    return ''
  }, [isSystem, safeMsg, isDayDivider])

  const classes = useMemo(() => {
    return [
      'message-item',
      isSystem ? 'message-system' : '',
      sysClass,
      isTemp ? 'message-temp' : '',
      isMe ? 'message-me' : '',
      hasReply ? 'message-has-reply' : '',
    ]
      .filter(Boolean)
      .join(' ')
  }, [isSystem, sysClass, isTemp, isMe, hasReply])

  const displayName = safeMsg.sender_name || 'Unknown'
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'

  // ================================
  // ⭐ Avatar
  // ================================
  const avatarUrl = useMemo(() => {
    let raw = safeMsg.sender_avatar_url || safeMsg.avatar_url || null
    if (typeof raw === 'string') {
      raw = raw.trim()
      if (!raw) raw = null
    }
    return raw ? buildImageUrl(raw) : null
  }, [safeMsg])

  const timeLabel = safeMsg.created_at ? formatTime?.(safeMsg.created_at) : ''

  // ================================
  // ⭐ Image detect + build URL
  // ================================
  const imageUrls = useMemo(() => {
    const urls = []

    const candidates =
      safeMsg.image_urls || safeMsg.images || safeMsg.attachments || safeMsg.files || safeMsg.media || null

    if (Array.isArray(candidates)) {
      for (const x of candidates) {
        if (!x) continue
        const u =
          typeof x === 'string'
            ? x
            : x.url || x.path || x.src || x.image_url || x.file_url || null
        if (typeof u === 'string' && u.trim()) urls.push(u.trim())
      }
    }

    const c = typeof safeMsg.content === 'string' ? safeMsg.content.trim() : ''
    const isImagePath =
      !!c &&
      /(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(c) &&
      (c.startsWith('/static/') || c.startsWith('http://') || c.startsWith('https://'))

    if (isImagePath) urls.push(c)

    return Array.from(new Set(urls)).map((u) => buildImageUrl(u))
  }, [safeMsg])

  const hasImages = messageType === 'image' || imageUrls.length > 0

  // ================================
  // ⭐ Modal preview (image)
  // ================================
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState(null)

  const openPreview = useCallback((src) => {
    setPreviewSrc(src)
    setPreviewOpen(true)
  }, [])

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewSrc(null)
  }, [])

  // ================================
  // ✅ Context menu: React + Reply
  // ================================
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const openMenuAt = useCallback((x, y) => {
    setMenuPos({ x, y })
    setMenuOpen(true)
  }, [])

  const handleContextMenu = useCallback(
    (e) => {
      if (isSystem) return
      if (safeMsg?.id == null) return

      e.preventDefault()
      e.stopPropagation()
      openMenuAt(e.clientX, e.clientY)
    },
    [openMenuAt, isSystem, safeMsg]
  )

  // ====== emit react: accept emoji OR keyword ======
  const emitReact = useCallback(
    (emojiOrKey) => {
      closeMenu()
      if (typeof onReactMessage !== 'function') return
      if (!safeMsg?.id) return

      const emoji =
        REACTION_KEY_TO_EMOJI[emojiOrKey] ||
        (REACTION_EMOJI_TO_KEY[emojiOrKey] ? emojiOrKey : null)

      const reactionKey =
        REACTION_EMOJI_TO_KEY[emojiOrKey] ||
        (REACTION_KEY_TO_EMOJI[emojiOrKey] ? emojiOrKey : null)

      onReactMessage({
        messageId: safeMsg.id,
        emoji: emoji || emojiOrKey,
        reaction: reactionKey || emojiOrKey,
        roomId: safeMsg.room_id,
        senderId: safeMsg.sender_id,
        createdAt: safeMsg.created_at,
        rawMsg: safeMsg,
      })
    },
    [closeMenu, onReactMessage, safeMsg]
  )

  const emitReply = useCallback(() => {
    closeMenu()
    if (typeof onReplyMessage !== 'function') return
    if (safeMsg?.id == null) return

    onReplyMessage({
      messageId: safeMsg.id,
      roomId: safeMsg.room_id,
      senderId: safeMsg.sender_id,
      senderName: safeMsg.sender_name || 'Unknown',
      content: safeMsg.content || '',
      createdAt: safeMsg.created_at,
      messageType,
      rawMsg: safeMsg,
    })
  }, [closeMenu, onReplyMessage, safeMsg, messageType])

  // ================================
  // ✅ Reply preview rendering + jump highlight
  // ================================
  const replyMeta = safeMsg.reply || null

  const replyPreviewText = useMemo(() => {
    if (!replyMeta) return ''
    const p = typeof replyMeta.preview === 'string' ? replyMeta.preview.trim() : ''
    if (p) return p
    const t = replyMeta.message_type
    if (t === 'image') return '[Image]'
    if (t === 'file') return '[File]'
    return ''
  }, [replyMeta])

  const jumpToRepliedMessage = useCallback(() => {
    if (!replyMeta?.message_id) return
    const el = document.getElementById(`msg-${replyMeta.message_id}`)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('cc-msg-highlight')
    window.setTimeout(() => {
      el.classList.remove('cc-msg-highlight')
    }, 1200)
  }, [replyMeta])

  // ================================
  // ✅ Reaction summary
  // ================================
  const reactionItems = useMemo(() => {
    const arr = Array.isArray(safeMsg.reactions) ? safeMsg.reactions : []
    return arr
      .filter((x) => x && x.count > 0 && x.reaction)
      .map((x) => ({
        key: String(x.reaction),
        emoji: REACTION_KEY_TO_EMOJI[String(x.reaction)] || String(x.reaction),
        count: Number(x.count) || 0,
        me: !!x.reacted_by_me,
      }))
      .sort((a, b) => b.count - a.count)
  }, [safeMsg])

  const hasReactions = reactionItems.length > 0

  // ================================
  // ✅ Seen rendering (Messenger-like)
  // ================================

  // ✅ FIX 1: filter out ME + dedupe + (optional) only include users who have seen up to this message
  const seenFiltered = useMemo(() => {
    const arr = Array.isArray(seenUsers) ? seenUsers : []
    const meId = Number(currentUserId)
    const msgId = Number(safeMsg?.id)

    const mp = new Map() // user_id -> user
    for (const u of arr) {
      if (!u) continue

      const uid = Number(u.user_id)
      if (!uid) continue
      if (uid === meId) continue

      // ✅ OPTIONAL: chỉ count nếu user đã seen tới message này
      // Nếu mày không muốn strict, comment 2 dòng dưới
      const lastSeenId = Number(u.last_seen_message_id || 0)
      if (msgId && lastSeenId > 0 && lastSeenId < msgId) continue

      if (!mp.has(uid)) mp.set(uid, u)
    }

    return Array.from(mp.values())
  }, [seenUsers, currentUserId, safeMsg?.id])

  // ✅ seenList dùng filtered (exclude me)
  const seenList = useMemo(() => {
    const arr = Array.isArray(seenFiltered) ? seenFiltered : []
    return arr
      .slice(0, 6)
      .map((u) => {
        const name = u.full_name || u.username || 'User'
        const raw = typeof u.avatar_url === 'string' ? u.avatar_url.trim() : ''
        return {
          userId: u.user_id,
          name,
          avatar: raw ? buildImageUrl(raw) : null,
          initial: (name || '?').trim().charAt(0).toUpperCase() || '?',
        }
      })
  }, [seenFiltered])

  // ✅ FIX 2: seenNumber phải tính theo filtered (không tính ME nữa)
  // Nếu BE đã gửi seenCount chuẩn (không include me) thì ưu tiên seenCount,
  // còn không thì fallback bằng seenFiltered.length
  const seenNumber =
    typeof seenCount === 'number' ? seenCount : seenFiltered.length

  const showSeen = isMe && !isSystem && !isTemp && isLatestMyMessage && seenNumber > 0

  // ✅ now safe to return
  if (!msg) return null

  return (
    <>
      <div
        id={safeMsg?.id != null ? `msg-${safeMsg.id}` : undefined}
        className={classes}
        role="presentation"
      >
        {/* ✅ DAY DIVIDER SYSTEM */}
        {isDayDivider ? (
          <div className="cc-day-divider">
            <span className="cc-day-divider-line" />
            <span className="cc-day-divider-pill">
              {safeMsg.content.slice(3, -3)}
            </span>
            <span className="cc-day-divider-line" />
          </div>
        ) : (
          <>
            {/* AVATAR */}
            {!isSystem && (
              <div className="message-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="message-avatar-img" />
                ) : (
                  <span className="message-avatar-fallback">{initial}</span>
                )}
              </div>
            )}

            {/* BODY */}
            <div className="message-body">
              <div className="message-meta">
                <div className="message-meta-left">
                  {!isSystem && <span className="message-author">{displayName}</span>}
                  {isSystem && <span className="message-author system-label">System</span>}
                </div>

                <div className="message-meta-right">
                  {timeLabel && <span className="message-time">{timeLabel}</span>}
                </div>
              </div>

              {/* ✅ REPLY PREVIEW */}
              {hasReply && (
                <button
                  type="button"
                  className="cc-reply-preview"
                  onClick={jumpToRepliedMessage}
                  title="Go to replied message"
                >
                  <span className="cc-reply-bar" />
                  <span className="cc-reply-content">
                    <span className="cc-reply-top">
                      <span className="cc-reply-name">{replyMeta?.sender_name || 'Unknown'}</span>
                    </span>
                    <span className="cc-reply-snippet">{replyPreviewText}</span>
                  </span>
                </button>
              )}

              {/* CONTENT */}
              {hasImages ? (
                <div className="message-bubble message-bubble-image" onContextMenu={handleContextMenu}>
                  <div className="message-images">
                    {imageUrls.map((src, idx) => (
                      <button
                        key={`${src}-${idx}`}
                        className="message-image-btn"
                        type="button"
                        onClick={() => openPreview(src)}
                        title="Click to preview"
                      >
                        <img
                          src={src}
                          alt={`chat-image-${idx}`}
                          className="message-image-thumb"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>

                  {typeof safeMsg.content === 'string' &&
                    safeMsg.content.trim() &&
                    !/(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(safeMsg.content.trim()) && (
                      <div className="message-image-caption">{safeMsg.content}</div>
                    )}
                </div>
              ) : (
                <div className="message-bubble" onContextMenu={handleContextMenu}>
                  {safeMsg.content}
                </div>
              )}

              {/* ✅ REACTIONS BAR */}
              {hasReactions && !isSystem && (
                <div className={`cc-reactions-row ${isMe ? 'cc-reactions-me' : ''}`}>
                  {reactionItems.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      className={`cc-reaction-pill ${r.me ? 'is-me' : ''}`}
                      onClick={() => emitReact(r.key)}
                      title={r.me ? 'You reacted (click to remove)' : 'React (click to add)'}
                    >
                      <span className="cc-reaction-emoji">{r.emoji}</span>
                      <span className="cc-reaction-count">{r.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ✅ SEEN ROW */}
              {showSeen && (
                <div className="cc-seen-row" title={`${seenNumber} seen`}>
                  <div className="cc-seen-avatars">
                    {seenList.map((u) => (
                      <span key={u.userId} className="cc-seen-avatar" title={u.name}>
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} />
                        ) : (
                          <span className="cc-seen-fallback">{u.initial}</span>
                        )}
                      </span>
                    ))}
                  </div>

                  {seenNumber > seenList.length && (
                    <span className="cc-seen-more">+{seenNumber - seenList.length}</span>
                  )}
                </div>
              )}

              <div className="message-footer">
                {isTemp && <span className="message-status">Sending to server...</span>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ✅ MINI CONTEXT MENU */}
      {menuOpen && !isSystem && (
        <MessageContextMenu
          x={menuPos.x}
          y={menuPos.y}
          emojis={REACT_EMOJIS}
          onReact={emitReact}
          onReply={emitReply}
          onClose={closeMenu}
        />
      )}

      {/* MODAL PREVIEW */}
      {previewOpen && <ImagePreviewModal src={previewSrc} onClose={closePreview} />}
    </>
  )
}

export default React.memo(ChatMessageItem)
