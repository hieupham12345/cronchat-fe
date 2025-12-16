import React, { useEffect, useMemo, useRef, useState } from 'react'
import { EMOJIS } from '../../utils/emojiData.js'

const DEFAULT_TABS = [
  { key: 'recent', label: '🕘', title: 'Recent' },
  { key: 'faces', label: '😀', title: 'Faces' },
  { key: 'hands', label: '👍', title: 'Hands' },
  { key: 'hearts', label: '❤️', title: 'Hearts' },
  { key: 'animals', label: '🐶', title: 'Animals' },
  { key: 'food', label: '🍕', title: 'Food' },
  { key: 'objects', label: '💻', title: 'Objects' },
  { key: 'travel', label: '🚀', title: 'Travel' },
]

function dedupeKeepOrder(arr) {
  const seen = new Set()
  const out = []
  for (const x of arr || []) {
    if (!x) continue
    if (seen.has(x)) continue
    seen.add(x)
    out.push(x)
  }
  return out
}

function inRanges(cp, ranges) {
  return ranges.some(([a, b]) => cp >= a && cp <= b)
}

function groupEmojis(emojis) {
  // heuristic grouping theo unicode range + vài bucket phổ biến (đủ dùng, nhanh)
  const buckets = {
    faces: [],
    hands: [],
    hearts: [],
    animals: [],
    food: [],
    objects: [],
    travel: [],
  }

  const FACE = [
    [0x1f600, 0x1f64f], // emoticons
    [0x1f910, 0x1f9ff], // supplemental symbols (nhiều mặt)
    [0x1fae0, 0x1faef], // newer face-ish
  ]
  const HAND = [
    [0x1f44a, 0x1f450],
    [0x1f590, 0x1f596],
    [0x1f918, 0x1f91f],
    [0x1f932, 0x1f93a],
    [0x1fa70, 0x1fa7c],
    [0x1faf0, 0x1faf8],
    [0x270a, 0x270d],
    [0x270c, 0x270c],
  ]
  const HEART = [
    [0x2665, 0x2665], // ♥
    [0x2764, 0x2764], // ❤
    [0x1f493, 0x1f49f], // hearts
    [0x1f9e1, 0x1f9e1], // 🧡
  ]
  const ANIMAL = [
    [0x1f400, 0x1f43f],
    [0x1f980, 0x1f997],
    [0x1f9a0, 0x1f9ae],
  ]
  const FOOD = [
    [0x1f32d, 0x1f37f],
    [0x1f950, 0x1f96b],
    [0x1f9c0, 0x1f9d1],
  ]
  const TRAVEL = [
    [0x1f680, 0x1f6ff],
    [0x2600, 0x26ff],
    [0x1f300, 0x1f320],
    [0x1f30d, 0x1f320],
  ]

  for (const e of emojis) {
    const cp = e.codePointAt(0) || 0

    if (inRanges(cp, HEART) || e.includes('❤️') || e.includes('♥')) buckets.hearts.push(e)
    else if (inRanges(cp, HAND)) buckets.hands.push(e)
    else if (inRanges(cp, FACE)) buckets.faces.push(e)
    else if (inRanges(cp, ANIMAL)) buckets.animals.push(e)
    else if (inRanges(cp, FOOD)) buckets.food.push(e)
    else if (inRanges(cp, TRAVEL)) buckets.travel.push(e)
    else buckets.objects.push(e)
  }

  return buckets
}

function getRecent() {
  try {
    const raw = localStorage.getItem('cc_recent_emojis')
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function pushRecent(emoji) {
  try {
    const cur = getRecent()
    const next = [emoji, ...cur.filter((x) => x !== emoji)].slice(0, 30)
    localStorage.setItem('cc_recent_emojis', JSON.stringify(next))
  } catch {
    // ignore
  }
}

export default function EmojiPicker({ onPick, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('faces')
  const [recentTick, setRecentTick] = useState(0)

  const btnRef = useRef(null)
  const popRef = useRef(null)

  const all = useMemo(() => dedupeKeepOrder(EMOJIS || []), [])
  const grouped = useMemo(() => groupEmojis(all), [all])

  // recent cần rerender khi pick/clear → dùng tick
  const recent = useMemo(() => {
    const r = getRecent()
    return dedupeKeepOrder(r).filter((e) => all.includes(e))
  }, [all, recentTick])

  const tabs = useMemo(() => DEFAULT_TABS, [])

  const activeList = useMemo(() => {
    if (tab === 'recent') return recent.length ? recent : grouped.faces.slice(0, 60)
    if (tab === 'faces') return grouped.faces
    if (tab === 'hands') return grouped.hands
    if (tab === 'hearts') return grouped.hearts
    if (tab === 'animals') return grouped.animals
    if (tab === 'food') return grouped.food
    if (tab === 'objects') return grouped.objects
    if (tab === 'travel') return grouped.travel
    return all
  }, [all, grouped, recent, tab])

  useEffect(() => {
    const onPointerDownCapture = (e) => {
      if (!open) return

      // check click nằm trong button hoặc popup -> KHÔNG đóng
      const path = e.composedPath ? e.composedPath() : []
      const inBtn = btnRef.current && (path.includes(btnRef.current) || btnRef.current.contains(e.target))
      const inPop = popRef.current && (path.includes(popRef.current) || popRef.current.contains(e.target))

      if (inBtn || inPop) return

      // click ra ngoài -> đóng
      setOpen(false)
    }

    // capture = true để bắt sớm, tránh bị focus/blur làm loạn
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [open])

  const toggle = () => {
    if (disabled) return
    setOpen((v) => !v)

    // khi mở popup: ưu tiên recent nếu có
    if (!open) {
      setTab(getRecent().length ? 'recent' : 'faces')
      setRecentTick((t) => t + 1)
    }
  }

  const handlePick = (emoji) => {
    if (disabled) return
    onPick?.(emoji)
    pushRecent(emoji)
    setRecentTick((t) => t + 1)
    // ✅ KHÔNG setOpen(false) — giữ popup mở để chọn nhiều emoji
  }

  const clearRecent = () => {
    try {
      localStorage.removeItem('cc_recent_emojis')
    } catch {}
    setRecentTick((t) => t + 1)
    setTab('faces')
  }

  return (
    <div className="cc-emoji-wrap">
      <button
        ref={btnRef}
        type="button"
        className="cc-emoji-btn"
        onClick={toggle}
        disabled={disabled}
        aria-label="Emoji"
      >
        🙂
      </button>

      {open && (
        <div ref={popRef} className="cc-emoji-pop" role="dialog" aria-label="Emoji picker">
          {/* Tabs */}
          <div className="cc-emoji-tabs" role="tablist">
            {tabs.map((t) => {
              const active = tab === t.key
              const isRecentEmpty = t.key === 'recent' && !recent.length
              return (
                <button
                  key={t.key}
                  type="button"
                  className={`cc-emoji-tab ${active ? 'is-active' : ''} ${isRecentEmpty ? 'is-dim' : ''}`}
                  onMouseDown={(e) => e.preventDefault()} // giữ caret ổn định
                  onClick={() => setTab(t.key)}
                  title={t.title}
                  aria-selected={active}
                  role="tab"
                >
                  {t.label}
                </button>
              )
            })}

            <div className="cc-emoji-tabs-spacer" />

            {tab === 'recent' && (
              <button
                type="button"
                className="cc-emoji-clear"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearRecent}
                title="Clear recent"
              >
                Clear
              </button>
            )}
          </div>

          {/* Grid */}
          <div className="cc-emoji-grid-wrap cc-scroll">
            <div className="cc-emoji-grid">
              {activeList.map((emj, idx) => (
                <button
                  key={`${emj}-${idx}`}
                  type="button"
                  className="cc-emoji-item"
                  onMouseDown={(e) => e.preventDefault()} // ✅ giữ caret/focus input ổn định
                  onClick={() => handlePick(emj)}
                  title={emj}
                >
                  {emj}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          {/* <div className="cc-emoji-foot">
            <button
              type="button"
              className="cc-emoji-close"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpen(false)}
              title="Close"
            >
              ✕
            </button>
          </div> */}
        </div>
      )}
    </div>
  )
}
