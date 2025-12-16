// src/components/dashboard/UserSidebar.jsx
import { useState, useEffect, useMemo } from 'react'
import {
  getDirectChat,
  uploadAvatar,
  getUserInfo,
  updateUserInfo,
  updatePassword,        // 👈 THÊM IMPORT
} from '../../services/userService'
import buildImageUrl from '../../utils/imageHandle.js' // 👈 IMPORT helper
import './UserSidebar.css'

function UserSidebar({
  user,
  displayName,
  avatarLetter,
  onOpenDirectRoom,
  users = [],
  loadingUsers = false,
  userListError = '',
  onSearchUsers, // search user qua API
}) {
  // ===== SEARCH STATE =====
  const [searchTerm, setSearchTerm] = useState('')

  // ===== LOADING TRONG LÚC TẠO / LẤY ROOM DIRECT =====
  const [loadingDirectUserId, setLoadingDirectUserId] = useState(null)

  // ===== KẾT QUẢ SEARCH TỪ API (FALLBACK) =====
  const [remoteUsers, setRemoteUsers] = useState([])

  // override avatar local cho UI demo { [userId]: { avatar_url } }
  const [avatarOverrides, setAvatarOverrides] = useState({})
  const [processingImage, setProcessingImage] = useState(false)
  const [compressedInfo, setCompressedInfo] = useState('') // text hiển thị size

  // 👇 dùng buildImageUrl để luôn ghép VITE_API_BASE_URL + /static/...
  const getSafeAvatar = (raw) => {
    if (!raw) return ''
    return buildImageUrl(raw)
  }

  // ====== MINI EDIT UI STATE (AVATAR + FULL NAME + PASSWORD) ======
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({
    avatar_url: '',
    full_name: '',
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  })

  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  const openEditUser = (u) => {
    setEditingUser(u)
    setEditError('')
    setCompressedInfo('')
    const currentOverride = avatarOverrides[u.id]?.avatar_url || u.avatar_url || ''
    setEditForm({
      avatar_url: currentOverride,
      full_name: u.full_name || '',
      current_password: '',
      new_password: '',
      confirm_new_password: '',
    })
  }

  const closeEditUser = () => {
    setEditingUser(null)
    setEditError('')
    setCompressedInfo('')
    setProcessingImage(false)
    // clear password cho chắc
    setEditForm((prev) => ({
      ...prev,
      current_password: '',
      new_password: '',
      confirm_new_password: '',
    }))
  }

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveEdit = async () => {
    if (!editingUser) {
      closeEditUser()
      return
    }

    setSavingEdit(true)
    setEditError('')

    const {
      full_name,
      current_password,
      new_password,
      confirm_new_password,
    } = editForm

    // ===== VALIDATE BLOCK ĐỔI PASSWORD =====
    const anyPasswordFilled =
      current_password || new_password || confirm_new_password

    if (anyPasswordFilled) {
      // 1) bắt buộc nhập đủ 3 trường
      if (!current_password || !new_password || !confirm_new_password) {
        setEditError('Please fill in all password fields to change your password.')
        setSavingEdit(false)
        return
      }

      // 2) new password >= 8 ký tự
      if (new_password.length < 8) {
        setEditError('New password must be at least 8 characters long.')
        setSavingEdit(false)
        return
      }

      // 3) new === confirm
      if (new_password !== confirm_new_password) {
        setEditError('New password and confirm password do not match.')
        setSavingEdit(false)
        return
      }

      // 4) Gọi API đổi password
      try {
        await updatePassword({
          current_password,
          new_password,
        })
      } catch (err) {
        console.error('update password error:', err)
        // nếu BE trả message cụ thể trong err.message thì show cho đẹp
        setEditError(
          err?.message || 'Failed to change password. Please check your current password.'
        )
        setSavingEdit(false)
        return
      }
    }

    // ===== UPDATE FULL NAME NẾU CÓ THAY ĐỔI =====
    try {
      if (editingUser.full_name !== full_name) {
        await updateUserInfo({
          full_name,
        })
      }
    } catch (err) {
      console.error('update full_name error:', err)
      setEditError('Failed to update display name.')
      setSavingEdit(false)
      return
    }

    // 🔄 LẤY LẠI USER MỚI NHẤT
    try {
      const res = await getUserInfo()
      const updatedUser = res?.user || res

      if (updatedUser) {
        try {
          localStorage.removeItem('currentUser')
        } catch (e) {
          console.warn('remove currentUser error', e)
        }

        try {
          localStorage.setItem('currentUser', JSON.stringify(updatedUser))
        } catch (e) {
          console.warn('set currentUser error', e)
        }
      }

      // đóng panel
      closeEditUser()

      // reload lại toàn bộ UI
      window.location.reload()
    } catch (err) {
      console.error('getUserInfo after save avatar/full_name error', err)
      setEditError('Failed to update user information. Please try refreshing the page.')
    } finally {
      setSavingEdit(false)
    }
  }

  // ====== XỬ LÝ FILE ẢNH: RESIZE + NÉN CLIENT + UPLOAD BE ======
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessingImage(true)
    setCompressedInfo('')
    setEditError('')

    const reader = new FileReader()

    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        try {
          const maxSize = 256
          let { width, height } = img

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width)
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height)
              height = maxSize
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                setEditError('Không thể nén ảnh, thử ảnh khác.')
                setProcessingImage(false)
                return
              }

              try {
                const fileName = `avatar_${editingUser?.id || 'me'}.jpg`
                const fileForUpload = new File([blob], fileName, {
                  type: 'image/jpeg',
                })

                const res = await uploadAvatar(fileForUpload)
                const serverUrl =
                  res?.avatar_url || res?.data?.avatar_url

                if (!serverUrl) {
                  setEditError('Upload avatar không thành công.')
                  setProcessingImage(false)
                  return
                }

                if (editingUser) {
                  setAvatarOverrides((prev) => ({
                    ...prev,
                    [editingUser.id]: {
                      avatar_url: serverUrl,
                    },
                  }))
                }

                setEditForm((prev) => ({
                  ...prev,
                  avatar_url: serverUrl,
                }))

                const kb = (blob.size / 1024).toFixed(1)
                setCompressedInfo(
                  `Đã nén & upload: ~${kb} KB, ${width}x${height}`
                )

                setProcessingImage(false)
              } catch (err) {
                console.error('upload avatar error', err)
                setEditError('Lỗi upload avatar, thử lại sau.')
                setProcessingImage(false)
              }
            },
            'image/jpeg',
            0.7
          )
        } catch (err) {
          console.error('process image error', err)
          setEditError('Lỗi xử lý ảnh.')
          setProcessingImage(false)
        }
      }
      img.onerror = () => {
        setEditError('Không load được ảnh, thử file khác.')
        setProcessingImage(false)
      }
      img.src = ev.target.result
    }

    reader.onerror = () => {
      setEditError('Không đọc được file ảnh.')
      setProcessingImage(false)
    }

    reader.readAsDataURL(file)
  }

  // ===== FILTER USERS THEO SEARCH (LOCAL) =====
  const filteredLocalUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return users

    return users.filter((u) => {
      const name = (u.full_name || '').toLowerCase()
      const username = (u.username || '').toLowerCase()
      return name.includes(q) || username.includes(q)
    })
  }, [users, searchTerm])

  const displayUsers =
    remoteUsers.length > 0 ? remoteUsers : filteredLocalUsers

  // ===== EFFECT: KHI LOCAL KHÔNG TÌM THẤY → GỌI API SEARCH =====
  useEffect(() => {
    const q = searchTerm.trim()
    if (!q) {
      setRemoteUsers([])
      return
    }

    const lower = q.toLowerCase()
    const localMatches = users.filter((u) => {
      const name = (u.full_name || '').toLowerCase()
      const username = (u.username || '').toLowerCase()
      return name.includes(lower) || username.includes(lower)
    })

    if (localMatches.length > 0) {
      setRemoteUsers([])
      return
    }

    if (!onSearchUsers) return

    let cancelled = false

    ;(async () => {
      try {
        const res = await onSearchUsers(q)
        const list = Array.isArray(res) ? res : res?.users

        if (cancelled) return

        if (!Array.isArray(list)) {
          setRemoteUsers([])
          return
        }

        setRemoteUsers(list)
      } catch (err) {
        if (!cancelled) {
          console.error('onSearchUsers error (UserSidebar):', err)
          setRemoteUsers([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchTerm, users, onSearchUsers])

  // ===== CLICK MESSAGE -> GỌI API DIRECT ROOM =====
  const handleClickMessage = async (targetUser) => {
    try {
      setLoadingDirectUserId(targetUser.id)
      const res = await getDirectChat(targetUser.id)
      const room = res?.room || res

      if (!room) {
        console.warn('No room returned from getDirectChat')
        return
      }

      if (typeof onOpenDirectRoom === 'function') {
        onOpenDirectRoom(room, targetUser)
      }
    } catch (err) {
      console.error('❌ Failed to get direct chat:', err)
    } finally {
      setLoadingDirectUserId(null)
    }
  }

  // ===== AVATAR CURRENT USER (CÓ OVERRIDE) =====
  const currentUserAvatarOverride =
    user && avatarOverrides[user.id]?.avatar_url

  const safeAvatarUrl = (() => {
    const src = currentUserAvatarOverride || user?.avatar_url
    if (!src) return ''
    return buildImageUrl(src)
  })()

  const fallbackLetter =
    avatarLetter ||
    (displayName
      ? displayName.charAt(0).toUpperCase()
      : user?.username?.charAt(0).toUpperCase() || '?')

  return (
    <>
      {/* CURRENT USER (TOP) */}
      <div
        className="user-account-row "
        onClick={() => {
          if (!user) return
          openEditUser(user)
        }}
      >
        <div className="user-avatar">
          {safeAvatarUrl ? (
            <img src={safeAvatarUrl} alt="avatar" loading="lazy" />
          ) : (
            fallbackLetter
          )}
        </div>

        <div className="user-inline">
          <span className="inline-name">
            {displayName || user?.full_name || user?.username}
          </span>
          <span className="inline-username">@{user?.username || ''}</span>
        </div>

        <div className="inline-actions" />
      </div>

      {/* USERS LIST SECTION */}
      <div className="section">
        <div className="section-title">Users</div>

        <div className="user-sidebar-search">
          <input
            type="text"
            placeholder="Search by name or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ul className="friends-list">
          {loadingUsers && <li className="empty-text">Loading users...</li>}

          {!loadingUsers && userListError && (
            <li className="empty-text">{userListError}</li>
          )}

          {!loadingUsers &&
            !userListError &&
            users.length === 0 &&
            !searchTerm &&
            remoteUsers.length === 0 && (
              <li className="empty-text">No users yet 😢</li>
            )}

          {!loadingUsers &&
            !userListError &&
            searchTerm &&
            displayUsers.length === 0 && (
              <li className="empty-text">No users match your search</li>
            )}

          {!loadingUsers &&
            !userListError &&
            displayUsers.map((u) => {
              const overrideAvatar = avatarOverrides[u.id]?.avatar_url
              const avatar = getSafeAvatar(overrideAvatar || u.avatar_url)
              const letter =
                (u.full_name && u.full_name.charAt(0).toUpperCase()) ||
                (u.username && u.username.charAt(0).toUpperCase()) ||
                '?'

              const isLoadingThisUser = loadingDirectUserId === u.id

              return (
                <li key={u.id} className="friend-row">
                  <div className="friend-avatar">
                    {avatar ? (
                      <img src={avatar} alt="avatar" loading="lazy" />
                    ) : (
                      letter
                    )}
                  </div>

                  <div className="friend-inline">
                    <span className="friend-name">
                      {u.full_name || u.username}
                    </span>
                    <span className="friend-username">@{u.username}</span>
                  </div>

                  <div className="inline-actions">
                    <button
                      type="button"
                      className="message-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClickMessage(u)
                      }}
                      title={`Send message to ${u.full_name || u.username}`}
                      disabled={isLoadingThisUser}
                    >
                      {isLoadingThisUser ? '...' : '💬'}
                    </button>
                  </div>
                </li>
              )
            })}
        </ul>

        {/* MINI EDIT AVATAR / PROFILE PANEL */}
        {editingUser && (
          <div className="user-edit-mini">
            <div className="user-edit-header">
              <span>Edit profile: {editingUser.username}</span>
              <button
                type="button"
                className="user-edit-close"
                onClick={closeEditUser}
                disabled={savingEdit || processingImage}
              >
                ✕
              </button>
            </div>

            <div className="user-edit-body">
              {/* Avatar preview */}
              <div className="avatar-preview-row">
                <div className="avatar-preview-box">
                  {editForm.avatar_url ? (
                    <img
                      src={buildImageUrl(editForm.avatar_url)}
                      alt="preview avatar"
                      loading="lazy"
                    />
                  ) : (
                    <span className="avatar-preview-placeholder">
                      No avatar
                    </span>
                  )}
                </div>
              </div>

              {/* File upload */}
              <div className="form-row">
                <label>Upload image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  disabled={processingImage}
                />
                {processingImage && (
                  <div className="user-edit-info">Đang xử lý ảnh...</div>
                )}
                {compressedInfo && (
                  <div className="user-edit-info">{compressedInfo}</div>
                )}
              </div>

              {/* Full name */}
              <div className="form-row">
                <label>Full name</label>
                <input
                  className="form-input"
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) =>
                    handleEditChange('full_name', e.target.value)
                  }
                  disabled={savingEdit || processingImage}
                  placeholder="Your display name"
                />
              </div>

              {/* Divider */}
              <div className="form-divider" />

              {/* Change password */}
              <div className="form-row">
                <label>Current password</label>
                <input
                  className="form-input"
                  type="password"
                  value={editForm.current_password}
                  onChange={(e) =>
                    handleEditChange('current_password', e.target.value)
                  }
                  disabled={savingEdit || processingImage}
                  placeholder="Current password"
                />
              </div>

              <div className="form-row">
                <label>New password</label>
                <input
                  className="form-input"
                  type="password"
                  value={editForm.new_password}
                  onChange={(e) =>
                    handleEditChange('new_password', e.target.value)
                  }
                  disabled={savingEdit || processingImage}
                  placeholder="New password (≥ 8 characters)"
                />
              </div>

              <div className="form-row">
                <label>Confirm new password</label>
                <input
                  className="form-input"
                  type="password"
                  value={editForm.confirm_new_password}
                  onChange={(e) =>
                    handleEditChange('confirm_new_password', e.target.value)
                  }
                  disabled={savingEdit || processingImage}
                  placeholder="Confirm new password"
                />
              </div>

              {editError && (
                <div className="user-edit-error">{editError}</div>
              )}
            </div>

            <div className="user-edit-actions">
              <button
                type="button"
                onClick={closeEditUser}
                disabled={savingEdit || processingImage}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit || processingImage}
              >
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default UserSidebar
