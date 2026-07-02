import { useEffect, useMemo, useRef } from 'react'

// Right-click menu for a message: quick reactions + reply. Rendered only while
// open, so it owns its outside-click / scroll / Escape dismissal listeners and
// clamps itself into the viewport.
export default function MessageContextMenu({ x, y, emojis, onReact, onReply, onClose }) {
  const menuRef = useRef(null)

  const menuStyle = useMemo(() => {
    const w = 230
    const h = 52
    const pad = 10
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800

    return {
      left: Math.min(x, vw - w - pad),
      top: Math.min(y, vh - h - pad),
    }
  }, [x, y])

  useEffect(() => {
    const onMouseDown = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) onClose()
    }
    const onScroll = () => onClose()
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div className="cc-context-menu" style={menuStyle} ref={menuRef}>
      <div className="cc-context-reactions">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="cc-context-btn"
            onClick={() => onReact(emoji)}
            title={`React ${emoji}`}
          >
            <span className="cc-context-emoji">{emoji}</span>
          </button>
        ))}
      </div>

      <div className="cc-context-divider" />

      <button type="button" className="cc-context-reply" onClick={onReply} title="Reply">
        ↩ Reply
      </button>
    </div>
  )
}
