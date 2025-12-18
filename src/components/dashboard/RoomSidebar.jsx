import { useEffect, useMemo, useState } from 'react'
import './RoomSidebar.css'
import buildImageUrl from '../../utils/imageHandle'
import { getUnreadCountsByRooms, getUnreadCountForRoom } from '../../services/chatService'

function RoomSidebar({
  rooms,
  setRooms, // ✅ ADD
  selectedRoomId,
  onSelectRoom,
  listUsers = [],
  currentUserId,
  onCreateGroup,
  onSearchUsers,
}) {

  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [searchUser, setSearchUser] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState(new Set())
  const [remoteUsers, setRemoteUsers] = useState([])

  // ===== MINI POPUP STATE (thay cho alert / window.confirm) =====
  const [miniMessage, setMiniMessage] = useState(null)
  // { type: 'error' | 'info', text: string }
  const [confirmCreate, setConfirmCreate] = useState(null)
  // { name: string, memberIds: number[] }

  // ===== SYNC UNREAD FROM DB (on enter / F5) =====
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        if (typeof window.__updateRoomSidebar !== 'function') return

        const ids = (rooms || []).map(r => Number(r.id)).filter(Boolean)
        if (ids.length === 0) return

        const res = await getUnreadCountsByRooms(ids)
        if (cancelled) return

        const counts = res?.counts
        if (!counts || typeof counts !== 'object') return

        for (const [roomIdStr, unreadVal] of Object.entries(counts)) {
          const rid = Number(roomIdStr)
          if (!rid) continue

          window.__updateRoomSidebar(rid, {
            unread_count: Number(unreadVal) || 0,
          })
        }
      } catch (e) {
        // console.error('[unread sync] failed', e)
      }
    })()

    return () => { cancelled = true }
  }, [rooms?.length])



  // ===== FILTER LOCAL USERS (bỏ currentUserId cho đồng nhất) =====
  const localFilteredUsers = useMemo(() => {
    const keyword = searchUser.trim().toLowerCase()

    const base = listUsers.filter((u) => u.id !== currentUserId)

    if (!keyword) return base

    return base.filter((u) => {
      const username = (u.username || '').toLowerCase()
      const fullName = (u.full_name || '').toLowerCase()
      return username.includes(keyword) || fullName.includes(keyword)
    })
  }, [listUsers, searchUser, currentUserId])

  useEffect(() => {
    if (typeof setRooms !== 'function') return

    const sortRooms = (arr) => {
      const list = Array.isArray(arr) ? [...arr] : []
      // ưu tiên updated_at, fallback created_at
      list.sort((a, b) => {
        const ta = new Date(a?.updated_at || a?.created_at || 0).getTime()
        const tb = new Date(b?.updated_at || b?.created_at || 0).getTime()
        return tb - ta
      })
      return list
    }

    window.__setRoomsSidebar = (nextRooms) => {
      setRooms(sortRooms(nextRooms || []))
    }

    window.__addRoomSidebar = (room) => {
      if (!room || room.id == null) return
      setRooms((prev) => {
        const existed = (prev || []).some((r) => Number(r.id) === Number(room.id))
        if (existed) return sortRooms(prev)
        return sortRooms([room, ...(prev || [])])
      })
    }

    window.__removeRoomSidebar = (roomId) => {
      setRooms((prev) => (prev || []).filter((r) => Number(r.id) !== Number(roomId)))
    }


    window.__updateRoomSidebar = (roomId, payload = {}, currentRoomId) => {
      setRooms((prev) => {
        const rid = Number(roomId)

        const next = (prev || []).map((r) => {
          if (Number(r.id) !== rid) return r

          const hasUnread = payload?.unread_count != null
          const safeUnread = hasUnread ? (Number(payload.unread_count) || 0) : (Number(r.unread_count) || 0)

          const safePayload = { ...payload }
          delete safePayload.bump_unread
          delete safePayload.bumpUnread

          return {
            ...r,
            ...safePayload,
            unread_count: safeUnread, // ✅ chỉ set theo DB/payload
          }
        })

        const found = next.some((r) => Number(r.id) === rid)
        if (!found && payload && Object.keys(payload).length > 0) {
          const hasUnread = payload?.unread_count != null
          next.unshift({
            id: rid,
            ...payload,
            unread_count: hasUnread ? (Number(payload.unread_count) || 0) : 0,
          })
        }

        return sortRooms(next)
      })
    }



    return () => {
      // cleanup tránh leak
      if (window.__setRoomsSidebar) delete window.__setRoomsSidebar
      if (window.__addRoomSidebar) delete window.__addRoomSidebar
      if (window.__removeRoomSidebar) delete window.__removeRoomSidebar
      if (window.__updateRoomSidebar) delete window.__updateRoomSidebar
    }
  }, [setRooms])



  // ===== ƯU TIÊN LOCAL, KO CÓ MỚI XÀI REMOTE =====
  const filteredUsers =
    remoteUsers.length > 0 ? remoteUsers : localFilteredUsers

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  const handleOpenCreateGroup = () => {
    setGroupName('')
    setSearchUser('')
    setSelectedUserIds(new Set())
    setRemoteUsers([])
    setShowCreateGroup(true)
  }

  const handleCancelCreateGroup = () => {
    setShowCreateGroup(false)
  }

  // ===== BẤM "CREATE GROUP" TRONG MODAL CHÍNH -> POPUP CONFIRM MINI =====
  const handleConfirmCreateGroup = () => {
    let memberIds = Array.from(selectedUserIds)

    if (!groupName.trim()) {
      setMiniMessage({
        type: 'error',
        text: 'Please enter a group name 😏',
      })
      return
    }

    if (memberIds.length === 0) {
      setMiniMessage({
        type: 'error',
        text: 'Please select at least one member 😏',
      })
      return
    }

    // auto add creator
    if (currentUserId != null) {
      const s = new Set(memberIds)
      s.add(currentUserId)
      memberIds = Array.from(s)
    }

    setConfirmCreate({
      name: groupName.trim(),
      memberIds,
    })
  }

  // ===== XỬ LÝ KHI USER BẤM OK TRONG MINI CONFIRM =====
  const handleDoCreateGroup = () => {
    if (!confirmCreate) return

    onCreateGroup?.({
      name: confirmCreate.name,
      member_ids: confirmCreate.memberIds,
    })

    // reset state
    setShowCreateGroup(false)
    setConfirmCreate(null)
    setGroupName('')
    setSearchUser('')
    setSelectedUserIds(new Set())
    setRemoteUsers([])
  }

  // ===== API SEARCH (fallback) =====
  useEffect(() => {
    const keyword = searchUser.trim()
    if (!keyword) {
      setRemoteUsers([])
      return
    }

    if (localFilteredUsers.length > 0) {
      setRemoteUsers([])
      return
    }

    if (!onSearchUsers) return

    let cancelled = false

    ;(async () => {
      try {
        const res = await onSearchUsers(keyword)
        const arr = Array.isArray(res) ? res : res?.users

        if (cancelled) return

        if (!Array.isArray(arr)) {
          setRemoteUsers([])
          return
        }

        setRemoteUsers(arr.filter((u) => u.id !== currentUserId))
      } catch (err) {
        if (!cancelled) {
          console.error('search error:', err)
          setRemoteUsers([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchUser, localFilteredUsers, onSearchUsers, currentUserId])

  return (
    <div className="section-rooms">
      <div className="section-header">
        <div className="section-title">Chat Rooms</div>

        <button
          type="button"
          className="create-room-btn"
          onClick={handleOpenCreateGroup}
          title="Create group chat"
        >
          <span className="create-room-icon">＋</span>
          <span className="create-room-text">New</span>
        </button>
      </div>

      <ul className="channel-list cc-scroll">
        {rooms.length === 0 && (
          <li className="empty-text">No rooms available.</li>
        )}

        {rooms.map((room) => (
          <li
            key={room.id}
            className={
              'channel-item' +
              (selectedRoomId === room.id ? ' channel-item-active' : '')
            }
            onClick={() => onSelectRoom(room.id)}
          >
            <div className="channel-main">
              <div className="channel-left">
                <div
                  className={
                    'channel-name ' +
                    (room.type === 'group'
                      ? 'channel-name-group'
                      : 'channel-name-direct')
                  }
                >
                  {room.displayName || room.name || `Room #${room.id}`}
                </div>

                <div className="channel-meta">
                  {room.type === 'direct' ? '' : 'Group'}
                  {room.is_active === 0 ? ' · inactive' : ''}
                </div>
              </div>

              {room.unread_count > 0 && (
                <span className="channel-unread-badge">
                  {room.unread_count > 99 ? '99+' : room.unread_count}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* CREATE GROUP OVERLAY – modal chính */}
      {showCreateGroup && (
        <div
          className="create-group-overlay"
          onClick={handleCancelCreateGroup}
        >
          <div
            className="create-group-modal"
            onClick={(e) => e.stopPropagation()} // tránh đóng khi click bên trong
          >
            <div className="create-group-header">
              <div className="create-group-title">Create group chat</div>
              <button
                type="button"
                className="create-group-close-btn"
                onClick={handleCancelCreateGroup}
              >
                ×
              </button>
            </div>

            <div className="create-group-body">
              <div className="form-field">
                <label className="form-label">Group name</label>
                <input
                  type="text"
                  className="form-input-search"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Example: Team Dev…"
                />
              </div>

              <div className="form-field">
                <label className="form-label">
                  Members ({selectedUserIds.size} selected)
                </label>

                <input
                  type="text"
                  className="form-input-search"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search members…"
                />

                <div className="create-group-user-list">
                  {filteredUsers.length === 0 && (
                    <div className="user-empty-text">No users found</div>
                  )}

                  {filteredUsers.map((u) => {
                    const isSelected = selectedUserIds.has(u.id)
                    const displayName =
                      u.full_name || u.username || `User #${u.id}`
                    const letter = (displayName[0] || '?').toUpperCase()

                    const avatarUrl = buildImageUrl(u.avatar_url)

                    return (
                      <button
                        key={u.id}
                        type="button"
                        className={
                          `create-group-user-item ` +
                          (isSelected ? 'create-group-user-item-selected' : '')
                        }
                        onClick={() => handleToggleUser(u.id)}
                      >
                        <div className="user-avatar-circle">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              loading="lazy"
                            />
                          ) : (
                            <span>{letter}</span>
                          )}
                        </div>

                        <div className="user-info">
                          <div className="user-fullname">{displayName}</div>
                          <div className="user-username">@{u.username}</div>
                        </div>

                        <div className="user-check">
                          {isSelected ? '✓' : ''}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="create-group-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancelCreateGroup}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmCreateGroup}
              >
                Create group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MINI POPUP MESSAGE – dùng .mini-popup-* (thay alert) */}
      {miniMessage && (
        <div className="mini-popup-overlay" onClick={() => setMiniMessage(null)}>
          <div
            className="mini-popup-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mini-popup-title">
              {miniMessage.type === 'error' ? 'Something went wrong' : 'Notice'}
            </div>
            <div className="mini-popup-text">{miniMessage.text}</div>
            <div className="mini-popup-actions">
              <button
                type="button"
                className="mini-popup-btn-primary"
                onClick={() => setMiniMessage(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MINI POPUP CONFIRM – dùng chung style mini popup */}
      {confirmCreate && (
        <div
          className="mini-popup-overlay"
          onClick={() => setConfirmCreate(null)}
        >
          <div
            className="mini-popup-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mini-popup-title">Create group</div>
            <div className="mini-popup-text">
              Create group "{confirmCreate.name}" with{' '}
              {confirmCreate.memberIds.length} members?
            </div>
            <div className="mini-popup-actions">
              <button
                type="button"
                className="mini-popup-btn-cancel"
                onClick={() => setConfirmCreate(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mini-popup-btn-primary"
                onClick={handleDoCreateGroup}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomSidebar
