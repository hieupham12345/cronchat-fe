import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import buildImageUrl from '../../utils/imageHandle.js'

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
  if (!msg) return null

  const messageType = msg.message_type || msg.type
  const isSystem = messageType === 'system'
  const isTemp = !!msg.is_temp

  const isMe =
    currentUserId != null &&
    msg.sender_id != null &&
    Number(msg.sender_id) === Number(currentUserId)

  const hasReply = !!msg.reply?.message_id

  const sysClass =
    isSystem && typeof msg.content === 'string'
      ? (msg.content.includes('👥') ? 'sys-add'
        : msg.content.includes('🚫') ? 'sys-remove'
        : msg.content.includes('✏️') ? 'sys-rename'
        : '')
      : ''

  const classes = [
    'message-item',
    isSystem ? 'message-system' : '',
    sysClass,
    isTemp ? 'message-temp' : '',
    isMe ? 'message-me' : '',
    hasReply ? 'message-has-reply' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const displayName = msg.sender_name || 'Unknown'
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'

  // ================================
  // ⭐ Avatar: buildImageUrl()
  // ================================
  let rawAvatar = msg.sender_avatar_url || msg.avatar_url || null
  if (typeof rawAvatar === 'string') {
    rawAvatar = rawAvatar.trim()
    if (rawAvatar === '') rawAvatar = null
  }
  const avatarUrl = rawAvatar ? buildImageUrl(rawAvatar) : null

  const timeLabel = msg.created_at ? formatTime(msg.created_at) : ''

  // ================================
  // ⭐ Image detect + build URL
  // ================================
  const imageUrls = useMemo(() => {
    const urls = []

    const candidates =
      msg.image_urls || msg.images || msg.attachments || msg.files || msg.media || null

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

    const c = typeof msg.content === 'string' ? msg.content.trim() : ''
    const isImagePath =
      !!c &&
      /(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(c) &&
      (c.startsWith('/static/') || c.startsWith('http://') || c.startsWith('https://'))

    if (isImagePath) urls.push(c)

    return Array.from(new Set(urls)).map((u) => buildImageUrl(u))
  }, [msg])

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

  useEffect(() => {
    if (!previewOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewOpen, closePreview])

  // ================================
  // ✅ Context menu: React + Reply
  // ================================
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const menuRef = useRef(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const openMenuAt = useCallback((x, y) => {
    setMenuPos({ x, y })
    setMenuOpen(true)
  }, [])

  const handleContextMenu = useCallback(
    (e) => {
      if (isSystem) return
      if (msg?.id == null) return

      e.preventDefault()
      e.stopPropagation()
      openMenuAt(e.clientX, e.clientY)
    },
    [openMenuAt, isSystem, msg]
  )

  useEffect(() => {
    if (!menuOpen) return

    const onMouseDown = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) closeMenu()
    }

    const onScroll = () => closeMenu()
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu()
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, closeMenu])

  // ====== emit react: accept emoji OR keyword ======
  const emitReact = useCallback(
    (emojiOrKey) => {
      closeMenu()
      if (typeof onReactMessage !== 'function') return
      if (!msg?.id) return

      const emoji =
        REACTION_KEY_TO_EMOJI[emojiOrKey] ||
        (REACTION_EMOJI_TO_KEY[emojiOrKey] ? emojiOrKey : null)

      const reactionKey =
        REACTION_EMOJI_TO_KEY[emojiOrKey] ||
        (REACTION_KEY_TO_EMOJI[emojiOrKey] ? emojiOrKey : null)

      onReactMessage({
        messageId: msg.id,
        emoji: emoji || emojiOrKey,
        reaction: reactionKey || emojiOrKey,
        roomId: msg.room_id,
        senderId: msg.sender_id,
        createdAt: msg.created_at,
        rawMsg: msg,
      })
    },
    [closeMenu, onReactMessage, msg]
  )

  const emitReply = useCallback(() => {
    closeMenu()
    if (typeof onReplyMessage !== 'function') return
    if (msg?.id == null) return

    onReplyMessage({
      messageId: msg.id,
      roomId: msg.room_id,
      senderId: msg.sender_id,
      senderName: msg.sender_name || 'Unknown',
      content: msg.content || '',
      createdAt: msg.created_at,
      messageType,
      rawMsg: msg,
    })
  }, [closeMenu, onReplyMessage, msg, messageType])

  // clamp menu inside viewport
  const menuStyle = useMemo(() => {
    const w = 230
    const h = 52
    const pad = 10
    const vw = window.innerWidth || 1200
    const vh = window.innerHeight || 800

    const x = Math.min(menuPos.x, vw - w - pad)
    const y = Math.min(menuPos.y, vh - h - pad)
    return { left: x, top: y }
  }, [menuPos])

  // ================================
  // ✅ Reply preview rendering + jump highlight
  // ================================
  const replyMeta = msg.reply || null

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
    const arr = Array.isArray(msg.reactions) ? msg.reactions : []
    return arr
      .filter((x) => x && x.count > 0 && x.reaction)
      .map((x) => ({
        key: String(x.reaction),
        emoji: REACTION_KEY_TO_EMOJI[String(x.reaction)] || String(x.reaction),
        count: Number(x.count) || 0,
        me: !!x.reacted_by_me,
      }))
      .sort((a, b) => b.count - a.count)
  }, [msg])

  const hasReactions = reactionItems.length > 0

  // ================================
  // ✅ Seen rendering (Messenger-like)
  // - Chỉ show dưới tin nhắn mới nhất do mình gửi
  // - seenUsers: loại bỏ bản thân + limit avatar cho gọn
  // ================================
  const seenList = useMemo(() => {
    const arr = Array.isArray(seenUsers) ? seenUsers : []
    const meId = Number(currentUserId)
    return arr
      .filter((u) => u && Number(u.user_id) !== meId)
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
  }, [seenUsers, currentUserId])

  const seenNumber =
    typeof seenCount === 'number' ? seenCount : (Array.isArray(seenUsers) ? seenUsers.length : 0)

  const showSeen = isMe && !isSystem && !isTemp && isLatestMyMessage && seenNumber > 0

  return (
    <>
      <div
        id={msg?.id != null ? `msg-${msg.id}` : undefined}
        className={classes}
        role="presentation"
      >
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
                  <span className="cc-reply-name">
                    {replyMeta?.sender_name || 'Unknown'}
                  </span>
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

              {typeof msg.content === 'string' &&
                msg.content.trim() &&
                !/(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(msg.content.trim()) && (
                  <div className="message-image-caption">{msg.content}</div>
                )}
            </div>
          ) : (
            <div className="message-bubble" onContextMenu={handleContextMenu}>
              {msg.content}
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

          {/* ✅ SEEN ROW (Messenger-like) */}
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
      </div>

      {/* ✅ MINI CONTEXT MENU */}
      {menuOpen && !isSystem && (
        <div className="cc-context-menu" style={menuStyle} ref={menuRef}>
          <div className="cc-context-reactions">
            {REACT_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="cc-context-btn"
                onClick={() => emitReact(emoji)}
                title={`React ${emoji}`}
              >
                <span className="cc-context-emoji">{emoji}</span>
              </button>
            ))}
          </div>

          <div className="cc-context-divider" />

          <button type="button" className="cc-context-reply" onClick={emitReply} title="Reply">
            ↩ Reply
          </button>
        </div>
      )}

      {/* MODAL PREVIEW */}
      {previewOpen && (
        <div className="img-preview-overlay" onClick={closePreview}>
          <div className="img-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="img-preview-close"
              onClick={closePreview}
              type="button"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>

            {previewSrc && <img src={previewSrc} alt="preview" className="img-preview-image" />}
          </div>
        </div>
      )}
    </>
  )
}

export default React.memo(ChatMessageItem)
