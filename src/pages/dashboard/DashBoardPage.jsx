// // src/pages/DashboardPage.jsx
// import { useEffect, useState, useMemo } from 'react'
// import { useNavigate } from 'react-router-dom'
// import './DashBoardPage.css'

// import {
//   getRoomChat,
//   getMessageRoomChat,
//   getDirectPartnerName,
//   createGroupChat,
//   addMembersToRoom,
//   searchUsers,
//   markRoomAsRead,
//   getRoomMembers,
//   deleteRoom,
//   uploadRoomImage
// } from '../../services/roomService'

// import { getListUser } from '../../services/userService'
// import { sendMessage } from '../../services/chatService'

// import UserSidebar from '../../components/dashboard/UserSidebar.jsx'
// import RoomSidebar from '../../components/dashboard/RoomSidebar.jsx'
// import ChatMain from '../../components/dashboard/ChatMain.jsx'

// function DashboardPage() {
//   // ======================
//   // STATE
//   // ======================
//   const [user, setUser] = useState(null)

//   const [rooms, setRooms] = useState([])
//   const [selectedRoomId, setSelectedRoomId] = useState(null)
//   const [loadingRooms, setLoadingRooms] = useState(true)
//   const [roomError, setRoomError] = useState('')

//   const [messages, setMessages] = useState([])
//   const [loadingMessages, setLoadingMessages] = useState(false)
//   const [messageError, setMessageError] = useState('')

//   const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
//   const [hasMoreMessages, setHasMoreMessages] = useState(true)

//   const [listUsers, setlistUsers] = useState([])
//   const [loadingUsers, setLoadingUsers] = useState(false)
//   const [userListError, setUserListError] = useState('')

//   const [miniMessage, setMiniMessage] = useState(null);
// // miniMessage = { type: 'error' | 'success', text: string }

//   const navigate = useNavigate()

//     // ===== HELPER =====
//   const formatTime = (value) => {
//     if (!value) return '';

//     // value dạng "2025-12-10T13:12:46"
//     if (typeof value === 'string') {
//       const [datePart, timePart] = value.split('T');
//       if (!datePart || !timePart) return value;

//       const [year, month, day] = datePart.split('-');
//       const [hour, minute] = timePart.split(':');

//       // format kiểu MM/DD, HH:MM (giống en-US m đang dùng)
//       return `${month}/${day}, ${hour}:${minute}`;
//     }

//     // nếu sau này có case number (unix timestamp) thì xử lý thêm ở đây
//     return '';
//   };


//   // ======================
//   // LOAD USER FROM STORAGE
//   // ======================
//   useEffect(() => {
//     const stored = localStorage.getItem('currentUser')
//     if (!stored) {
//       navigate('/login', { replace: true })
//       return
//     }

//     try {
//       const parsed = JSON.parse(stored)
//       setUser(parsed)
//     } catch (err) {
//       console.error('Cannot parse currentUser:', err)
//       navigate('/login', { replace: true })
//     }
//   }, [navigate])

//   // ======================
//   // UPDATE PAGE TITLE (HOOK MUST BE BEFORE ANY RETURN)
//   // ======================
//   useEffect(() => {
//     const total = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0)
//     document.title = total > 0
//       ? `📩 (${total}) CronChat`
//       : '💬 CronChat'
//   }, [rooms])

//   // ======================
//   // LOAD ALL USERS
//   // ======================
//   useEffect(() => {
//     if (!user) return

//     async function fetchUsers() {
//       try {
//         setLoadingUsers(true)
//         setUserListError('')

//         const res = await getListUser()
//         const arr = Array.isArray(res) ? res : res?.users

//         if (!Array.isArray(arr)) throw new Error('Invalid users format')

//         setlistUsers(arr)
//       } catch (err) {
//         console.error('fetchUsers error:', err)
//         setUserListError('Failed to load users')
//       } finally {
//         setLoadingUsers(false)
//       }
//     }

//     fetchUsers()
//   }, [user])
//   // ======================
//   // LOAD ROOMS (with direct partner name)
//   // ======================
//   useEffect(() => {
//     let cancelled = false

//     async function fetchRooms() {
//       try {
//         setLoadingRooms(true)
//         setRoomError('')

//         const res = await getRoomChat()
//         const arr = Array.isArray(res?.rooms) ? res.rooms : []

//         if (cancelled) return

//         // 1️⃣ Render rooms trước (cho UI lên ngay)
//         const initialRooms = arr.map((room) => ({
//           ...room,
//           displayName:
//             room.type === 'direct'
//               ? (room.displayName || room.name || 'Direct chat')
//               : (room.displayName || room.name),
//         }))

//         setRooms(initialRooms)

//         // 2️⃣ Hydrate tên partner cho direct rooms (chỉ room thiếu displayName)
//         const directRooms = initialRooms.filter(
//           (r) =>
//             r.type === 'direct' &&
//             (!r.displayName || r.displayName === 'Direct chat')
//         )

//         if (directRooms.length === 0) return

//         const results = await Promise.all(
//           directRooms.map(async (room) => {
//             try {
//               const r = await getDirectPartnerName(room.id)
//               const name =
//                 r?.full_name ||
//                 r?.name ||
//                 room.name ||
//                 'Direct chat'
//               return { roomId: room.id, displayName: name }
//             } catch {
//               return { roomId: room.id, displayName: room.name || 'Direct chat' }
//             }
//           })
//         )

//         if (cancelled) return

//         // 3️⃣ Merge displayName vào rooms state
//         setRooms((prev) =>
//           (prev || []).map((room) => {
//             if (room.type !== 'direct') return room
//             const hit = results.find(
//               (x) => Number(x.roomId) === Number(room.id)
//             )
//             return hit && hit.displayName
//               ? { ...room, displayName: hit.displayName }
//               : room
//           })
//         )
//       } catch (err) {
//         console.error('fetchRooms error:', err)
//         if (!cancelled) {
//           setRoomError(err?.message || 'Failed to load rooms')
//         }
//       } finally {
//         if (!cancelled) setLoadingRooms(false)
//       }
//     }

//     fetchRooms()

//     return () => {
//       cancelled = true
//     }
//   }, [])


//   // ======================
//   // FETCH ROOM MESSAGES (SORT ASC)
//   // ======================
//   async function fetchRoomMessages(roomId, { beforeId = 0, limit = 40 } = {}) {
//     const res = await getMessageRoomChat(roomId, { beforeId, limit })
//     let list = Array.isArray(res.messages) ? res.messages : []

//     return list.sort(
//       (a, b) =>
//         new Date(a.created_at || a.createdAt) -
//         new Date(b.created_at || b.createdAt)
//     )
//   }

//   // ======================
//   // LOAD INITIAL MESSAGES
//   // ======================
//   async function loadInitialMessages(roomId) {
//     if (!roomId) return
//     setLoadingMessages(true)
//     setMessageError('')
//     setHasMoreMessages(true)
//     setMessages([])

//     try {
//       const list = await fetchRoomMessages(roomId, { beforeId: 0, limit: 40 })
//       setMessages(list)

//       setHasMoreMessages(list.length === 40)
//     } catch (err) {
//       setMessageError(err.message || 'Failed to load messages')
//     } finally {
//       setLoadingMessages(false)
//     }
//   }

//   // ======================
//   // AUTO SELECT FIRST ROOM (CHỈ KHI CHƯA CÓ ROOM ĐƯỢC CHỌN)
//   // ======================
//   useEffect(() => {
//     if (rooms.length === 0) return

//     // Nếu đã có selectedRoomId (user đã click room khác / đã mở direct / group)
//     // thì KHÔNG auto ép về room[0] nữa.
//     if (selectedRoomId != null) return

//     const first = rooms[0].id
//     setSelectedRoomId(first)
//     loadInitialMessages(first)
//   }, [rooms, selectedRoomId])

//   // ======================
//   // HANDLE SELECT ROOM
//   // ======================
//   const handleSelectRoom = async (roomId) => {
//     setSelectedRoomId(roomId)
//     loadInitialMessages(roomId)

//     let prevUnread = 0
//     setRooms((prev) =>
//       prev.map((r) => {
//         if (r.id === roomId) {
//           prevUnread = r.unread_count || 0
//           return { ...r, unread_count: 0 }
//         }
//         return r
//       })
//     )

//     try {
//       await markRoomAsRead(roomId) // ✅ API call
//     } catch (err) {
//       console.error(err)
//       // rollback
//       setRooms((prev) =>
//         prev.map((r) =>
//           r.id === roomId ? { ...r, unread_count: prevUnread } : r
//         )
//       )
//     }
//   }

//   const selectedRoom = useMemo(
//     () => rooms.find((r) => r.id === selectedRoomId) || null,
//     [rooms, selectedRoomId]
//   )

//   // ======================
//   // LOAD OLDER MESSAGES
//   // ======================
//   async function handleLoadOlderMessages(beforeId) {
//     if (!selectedRoomId || !beforeId) return
//     if (!hasMoreMessages || loadingOlderMessages || loadingMessages) return

//     setLoadingOlderMessages(true)

//     try {
//       const older = await fetchRoomMessages(selectedRoomId, {
//         beforeId,
//         limit: 40,
//       })

//       if (older.length === 0) {
//         setHasMoreMessages(false)
//         return
//       }

//       setMessages((prev) => {
//         const exist = new Set(prev.map((m) => m.id))
//         const merged = [...older.filter((m) => !exist.has(m.id)), ...prev]
//         return merged
//       })

//       if (older.length < 40) setHasMoreMessages(false)
//     } finally {
//       setLoadingOlderMessages(false)
//     }
//   }

//   // ======================
//   // SEND MESSAGE
//   // ======================
//   const handleSendMessage = async (roomId, content, messageType = 'text', replyToMessageId) => {
//     if (!user) return
//     try {
//       await sendMessage(roomId, content, messageType, replyToMessageId)

//     } catch (err) {
//       console.error('Send message failed:', err)
//       setMessageError('Failed to send message')
//     }
//   }

//     // Parent (DashboardPage / container)
//   const handleUploadRoomImages = async ({ roomId, files }) => {
//     // files: File[]
//     const results = [];

//     for (const f of files) {
//       const res = await uploadRoomImage(roomId, f); // res = { media_url, ... }
//       results.push(res);
//     }

//     // ✅ trả về để ChatMain dùng
//     return {
//       media_urls: results.map((x) => x.media_url).filter(Boolean),
//       results,
//     };
//   };


//   // ======================
//   // REALTIME UPDATE
//   // ======================
//  const handleRealtimeMessage = (rawMsg) => {
//     const roomId =
//       rawMsg.room_id != null
//         ? Number(rawMsg.room_id)
//         : rawMsg.roomId != null
//         ? Number(rawMsg.roomId)
//         : null

//     if (!roomId) {
//       console.warn('Realtime msg missing roomId:', rawMsg)
//       return
//     }

//     const senderId =
//       rawMsg.sender_id != null
//         ? Number(rawMsg.sender_id)
//         : rawMsg.senderId != null
//         ? Number(rawMsg.senderId)
//         : null

//     const content = rawMsg.content ?? rawMsg.text ?? ''

//     // ==== 1. Lấy createdAt gốc từ socket / fallback ====
//     let createdAtRaw =
//       rawMsg.created_at ??
//       rawMsg.createdAt ??
//       new Date().toISOString()

//     // ==== 2. Nếu là chuỗi UTC (có 'Z') -> convert sang LOCAL ====
//     let createdAt = createdAtRaw

//     if (typeof createdAtRaw === 'string' && createdAtRaw.includes('Z')) {
//       const d = new Date(createdAtRaw)
//       if (!Number.isNaN(d.getTime())) {
//         const pad = (n) => String(n).padStart(2, '0')
//         const year = d.getFullYear()
//         const month = pad(d.getMonth() + 1)
//         const day = pad(d.getDate())
//         const hour = pad(d.getHours())      // giờ LOCAL
//         const minute = pad(d.getMinutes())
//         const second = pad(d.getSeconds())

//         // format giống API: "YYYY-MM-DDTHH:MM:SS"
//         createdAt = `${year}-${month}-${day}T${hour}:${minute}:${second}`
//       }
//     }

//     // ====== Cập nhật messages nếu đang ở đúng room ======
//     setMessages((prev) => {
//       // chỉ nhận nếu đang ở đúng room
//       if (selectedRoomId !== roomId) return prev

//       // tránh duplicate
//       if (prev.some((m) => m.id === rawMsg.id)) return prev

//       const normalizedMsg = {
//         ...rawMsg,
//         room_id: roomId,
//         sender_id: senderId,
//         content,
//         created_at: createdAt, // cái ông đã chuẩn hoá ở trên
//       }

//       // ✅ KHÔNG SORT LẠI NỮA, CHỈ PUSH CUỐI
//       return [...prev, normalizedMsg]
//     })


//     // ====== Cập nhật rooms ======
//     setRooms((prev) => {
//       let found = false

//       let updated = prev.map((room) => {
//         if (Number(room.id) !== roomId) return room
//         found = true

//         const base = {
//           ...room,
//           updated_at: createdAt,    // 👈 cũng dùng local
//           last_message: content,
//         }

//         if (room.id !== selectedRoomId || document.hidden) {
//           const currentUnread = Number(room.unread_count || 0)
//           return {
//             ...base,
//             unread_count: currentUnread + 1,
//           }
//         }

//         return base
//       })

//       if (!found) {
//         console.warn('Realtime msg for room not in state:', roomId, rawMsg)
//         return prev
//       }

//       updated = [...updated].sort(
//         (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
//       )

//       return updated
//     })

//     const senderName = rawMsg.sender_name || rawMsg.senderName || 'New message'
//     // showBrowserNotification(senderName, content)
//   }



//   // ======================
//   // CREATE GROUP
//   // ======================
//   const handleCreateGroup = async ({ name, member_ids }) => {
//     try {
//       const res = await createGroupChat(name, member_ids)
//       const room = res.room || res
//       if (!room?.id) throw new Error('Invalid room')

//       const newRoom = {
//         ...room,
//         displayName: room.name || 'New Group',
//       }

//       setRooms((prev) => {
//         if (prev.some((r) => r.id === newRoom.id)) return prev
//         return [newRoom, ...prev]
//       })

//       setSelectedRoomId(newRoom.id)
//       loadInitialMessages(newRoom.id)
//     } catch (err) {
//       console.error('Create group failed:', err)
//       setMiniMessage({
//         type: 'error',
//         text: 'Create group failed. Please try again 🤧',
//       })
//     }
//   }

//   // ======================
//   // ADD MEMBERS
//   // ======================
//   const addMembersToRoomHandler = async ({ roomId, member_ids }) => {
//     try {
//       const res = await addMembersToRoom(roomId, member_ids)
//       // có thể return để FE dùng nếu muốn show chi tiết added/skipped
//       return res
//     } catch (err) {
//       console.error('Add members failed:', err)
//       // throw cho ChatMain catch và setAddFeedback('error')
//       throw err
//     }
//   }

//   // ======================
//   // OPEN DIRECT ROOM
//   // ======================
//   const handleOpenDirectRoom = (room, targetUser) => {
//     const partnerName =
//       targetUser?.full_name ||
//       targetUser?.fullName ||
//       targetUser?.username

//     const newRoom = {
//       ...room,
//       displayName: partnerName || room.name || 'Direct chat',
//     }

//     setRooms((prev) => {
//       if (prev.some((r) => r.id === newRoom.id)) return prev
//       return [newRoom, ...prev]
//     })

//     setSelectedRoomId(newRoom.id)
//     loadInitialMessages(newRoom.id)
//   }

//   // ======================
//   // SEARCH USERS
//   // ======================
//   const handleSearchUsers = async (keyword) => {
//     const q = keyword.trim()
//     if (!q) return []

//     try {
//       const res = await searchUsers(q)
//       const arr = Array.isArray(res) ? res : res?.users || []
//       return arr.filter((u) => u.id !== user.id)
//     } catch {
//       return []
//     }
//   }

//   // ======================
//   // RETURN NULL WHEN USER NOT LOADED (NO HOOK BELOW THIS POINT)
//   // ======================
//   if (!user) return null

//   const displayName = user.full_name 
//   const avatarLetter = displayName.charAt(0).toUpperCase()

//   const usersForSidebar = listUsers.filter((u) => u.id !== user.id)



//   const handleGetRoomMembers = async (roomId) => {
//     try {
//       const membersData = await getRoomMembers(roomId); 
//       return membersData.members || [];
//     } catch (err) {
//       console.error('Failed to get room members:', err);
//       return [];
//     }
//   }

//   const handleDeleteRoom = async (roomId) => {  
//     try {
//       await deleteRoom(roomId); 
//       setRooms((prev) => prev.filter((r) => r.id !== roomId));
//     } catch (err) {
//       console.error('Delete room failed:', err);
//       setMiniMessage({
//         type: 'error',
//         text: 'Delete room failed. Please try again 🤧',
//       })
//     }
//   }


//   // const onUploadRoomImage = async ({ roomId, files }) => {
//   //   for (const f of files) {
//   //     await uploadRoomImage(roomId, f)   // gọi service của mày
//   //   }
//   // }

//   // ======================
//   // RENDER
//   // ======================
//   return (
//     <div className="dashboard">
//       <div className="dashboard-box">
        
//         {/* LEFT SIDEBAR */}
//         <div>
//           <UserSidebar
//             user={user}
//             displayName= {displayName}
//             avatarLetter={avatarLetter}
//             users={usersForSidebar}
//             loadingUsers={loadingUsers}
//             userListError={userListError}
//             onOpenDirectRoom={handleOpenDirectRoom}
//             onSearchUsers={handleSearchUsers}
//           />
//         </div>

//         {/* MAIN CHAT */}
//         <main className="chat-main">
//           <ChatMain
//             selectedRoom={selectedRoom}
//             loadingRooms={loadingRooms}
//             roomError={roomError}
//             messages={messages}
//             loadingMessages={loadingMessages}
//             messageError={messageError}
//             currentUserId={user.id}
//             onSendMessage={handleSendMessage}
//             setMessages={setMessages}
//             onRealtimeMessage={handleRealtimeMessage}
//             listUsers={listUsers}
//             onAddMembersToRoom={addMembersToRoomHandler}
//             onSearchUsers={handleSearchUsers}
//             onLoadOlderMessages={handleLoadOlderMessages}
//             loadingOlderMessages={loadingOlderMessages}
//             hasMoreMessages={hasMoreMessages}
//             formatTime={formatTime}
//             RoomMembers={handleGetRoomMembers}
//             onDeleteRoom={handleDeleteRoom}
//             onUploadRoomImages={handleUploadRoomImages}
//           />
//         </main>

//         {/* RIGHT SIDEBAR */}
//         <aside className="sidebar sidebar-right">
//           <RoomSidebar
//             rooms={rooms}
//             setRooms={setRooms} // ✅ ADD
//             selectedRoomId={selectedRoomId}
//             onSelectRoom={handleSelectRoom}
//             listUsers={usersForSidebar}
//             currentUserId={user.id}
//             onCreateGroup={handleCreateGroup}
//             onSearchUsers={handleSearchUsers}
//           />
//         </aside>

//       </div>
//     </div>
//   )
// }

// export default DashboardPage


// src/pages/DashboardPage.jsx
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import './DashBoardPage.css'

import {
  getRoomChat,
  getMessageRoomChat,
  getDirectPartnerName,
  createGroupChat,
  addMembersToRoom,
  searchUsers,
  markRoomAsRead,
  getRoomMembers,
  deleteRoom,
  uploadRoomImage
} from '../../services/roomService'

import { getListUser } from '../../services/userService'
import { sendMessage } from '../../services/chatService'

import UserSidebar from '../../components/dashboard/UserSidebar.jsx'
import RoomSidebar from '../../components/dashboard/RoomSidebar.jsx'
import ChatMain from '../../components/dashboard/ChatMain.jsx'

function DashboardPage() {
  // ======================
  // STATE
  // ======================
  const [user, setUser] = useState(null)

  const [rooms, setRooms] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [roomError, setRoomError] = useState('')

  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageError, setMessageError] = useState('')

  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)

  const [listUsers, setlistUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userListError, setUserListError] = useState('')

  const [miniMessage, setMiniMessage] = useState(null);
// miniMessage = { type: 'error' | 'success', text: string }

  const navigate = useNavigate()

    // ===== HELPER =====
  const formatTime = (value) => {
    if (!value) return '';

    // value dạng "2025-12-10T13:12:46"
    if (typeof value === 'string') {
      const [datePart, timePart] = value.split('T');
      if (!datePart || !timePart) return value;

      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');

      // format kiểu MM/DD, HH:MM (giống en-US m đang dùng)
      return `${month}/${day}, ${hour}:${minute}`;
    }

    // nếu sau này có case number (unix timestamp) thì xử lý thêm ở đây
    return '';
  };


  // ======================
  // LOAD USER FROM STORAGE
  // ======================
  useEffect(() => {
    const stored = localStorage.getItem('currentUser')
    if (!stored) {
      navigate('/login', { replace: true })
      return
    }

    try {
      const parsed = JSON.parse(stored)
      setUser(parsed)
    } catch (err) {
      console.error('Cannot parse currentUser:', err)
      navigate('/login', { replace: true })
    }
  }, [navigate])

  // ======================
  // UPDATE PAGE TITLE (HOOK MUST BE BEFORE ANY RETURN)
  // ======================
  useEffect(() => {
    const total = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0)
    document.title = total > 0
      ? `📩 (${total}) CronChat`
      : '💬 CronChat'
  }, [rooms])

  // ======================
  // LOAD ALL USERS
  // ======================
  useEffect(() => {
    if (!user) return

    async function fetchUsers() {
      try {
        setLoadingUsers(true)
        setUserListError('')

        const res = await getListUser()
        const arr = Array.isArray(res) ? res : res?.users

        if (!Array.isArray(arr)) throw new Error('Invalid users format')

        setlistUsers(arr)
      } catch (err) {
        console.error('fetchUsers error:', err)
        setUserListError('Failed to load users')
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [user])
  // ======================
  // LOAD ROOMS (with direct partner name)
  // ======================
  useEffect(() => {
    let cancelled = false

    async function fetchRooms() {
      try {
        setLoadingRooms(true)
        setRoomError('')

        const res = await getRoomChat()
        const arr = Array.isArray(res?.rooms) ? res.rooms : []

        if (cancelled) return

        // 1️⃣ Render rooms trước (cho UI lên ngay)
        const initialRooms = arr.map((room) => ({
          ...room,
          displayName:
            room.type === 'direct'
              ? (room.displayName || room.name || 'Direct chat')
              : (room.displayName || room.name),
        }))

        setRooms(initialRooms)

        // 2️⃣ Hydrate tên partner cho direct rooms (chỉ room thiếu displayName)
        const directRooms = initialRooms.filter(
          (r) =>
            r.type === 'direct' &&
            (!r.displayName || r.displayName === 'Direct chat')
        )

        if (directRooms.length === 0) return

        const results = await Promise.all(
          directRooms.map(async (room) => {
            try {
              const r = await getDirectPartnerName(room.id)
              const name =
                r?.full_name ||
                r?.name ||
                room.name ||
                'Direct chat'
              return { roomId: room.id, displayName: name }
            } catch {
              return { roomId: room.id, displayName: room.name || 'Direct chat' }
            }
          })
        )

        if (cancelled) return

        // 3️⃣ Merge displayName vào rooms state
        setRooms((prev) =>
          (prev || []).map((room) => {
            if (room.type !== 'direct') return room
            const hit = results.find(
              (x) => Number(x.roomId) === Number(room.id)
            )
            return hit && hit.displayName
              ? { ...room, displayName: hit.displayName }
              : room
          })
        )
      } catch (err) {
        console.error('fetchRooms error:', err)
        if (!cancelled) {
          setRoomError(err?.message || 'Failed to load rooms')
        }
      } finally {
        if (!cancelled) setLoadingRooms(false)
      }
    }

    fetchRooms()

    return () => {
      cancelled = true
    }
  }, [])


  // ======================
  // FETCH ROOM MESSAGES (SORT ASC)
  // ======================
  async function fetchRoomMessages(roomId, { beforeId = 0, limit = 40 } = {}) {
    const res = await getMessageRoomChat(roomId, { beforeId, limit })
    let list = Array.isArray(res.messages) ? res.messages : []

    return list.sort(
      (a, b) =>
        new Date(a.created_at || a.createdAt) -
        new Date(b.created_at || b.createdAt)
    )
  }

  // ======================
  // LOAD INITIAL MESSAGES
  // ======================
  async function loadInitialMessages(roomId) {
    if (!roomId) return
    setLoadingMessages(true)
    setMessageError('')
    setHasMoreMessages(true)
    setMessages([])

    try {
      const list = await fetchRoomMessages(roomId, { beforeId: 0, limit: 40 })
      setMessages(list)

      setHasMoreMessages(list.length === 40)
    } catch (err) {
      setMessageError(err.message || 'Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  // ======================
  // AUTO SELECT FIRST ROOM (CHỈ KHI CHƯA CÓ ROOM ĐƯỢC CHỌN)
  // ======================
  useEffect(() => {
    if (rooms.length === 0) return

    // Nếu đã có selectedRoomId (user đã click room khác / đã mở direct / group)
    // thì KHÔNG auto ép về room[0] nữa.
    if (selectedRoomId != null) return

    const first = rooms[0].id
    setSelectedRoomId(first)
    loadInitialMessages(first)
  }, [rooms, selectedRoomId])

  // ======================
  // HANDLE SELECT ROOM
  // ======================
  const handleSelectRoom = async (roomId) => {
    setSelectedRoomId(roomId)
    loadInitialMessages(roomId)

    let prevUnread = 0
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          prevUnread = r.unread_count || 0
          return { ...r, unread_count: 0 }
        }
        return r
      })
    )

    try {
      await markRoomAsRead(roomId) // ✅ API call
    } catch (err) {
      console.error(err)
      // rollback
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, unread_count: prevUnread } : r
        )
      )
    }
  }

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  )

  // ======================
  // LOAD OLDER MESSAGES
  // ======================
  async function handleLoadOlderMessages(beforeId) {
    if (!selectedRoomId || !beforeId) return
    if (!hasMoreMessages || loadingOlderMessages || loadingMessages) return

    setLoadingOlderMessages(true)

    try {
      const older = await fetchRoomMessages(selectedRoomId, {
        beforeId,
        limit: 40,
      })

      if (older.length === 0) {
        setHasMoreMessages(false)
        return
      }

      setMessages((prev) => {
        const exist = new Set(prev.map((m) => m.id))
        const merged = [...older.filter((m) => !exist.has(m.id)), ...prev]
        return merged
      })

      if (older.length < 40) setHasMoreMessages(false)
    } finally {
      setLoadingOlderMessages(false)
    }
  }

  // ======================
  // SEND MESSAGE
  // ======================
  const handleSendMessage = async (roomId, content, messageType = 'text', replyToMessageId) => {
    if (!user) return
    try {
      await sendMessage(roomId, content, messageType, replyToMessageId)

    } catch (err) {
      console.error('Send message failed:', err)
      setMessageError('Failed to send message')
    }
  }

    // Parent (DashboardPage / container)
  const handleUploadRoomImages = async ({ roomId, files }) => {
    // files: File[]
    const results = [];

    for (const f of files) {
      const res = await uploadRoomImage(roomId, f); // res = { media_url, ... }
      results.push(res);
    }

    // ✅ trả về để ChatMain dùng
    return {
      media_urls: results.map((x) => x.media_url).filter(Boolean),
      results,
    };
  };


  // ======================
  // REALTIME UPDATE
  // ======================
 const handleRealtimeMessage = (rawMsg) => {
    const roomId =
      rawMsg.room_id != null
        ? Number(rawMsg.room_id)
        : rawMsg.roomId != null
        ? Number(rawMsg.roomId)
        : null

    if (!roomId) {
      console.warn('Realtime msg missing roomId:', rawMsg)
      return
    }

    const senderId =
      rawMsg.sender_id != null
        ? Number(rawMsg.sender_id)
        : rawMsg.senderId != null
        ? Number(rawMsg.senderId)
        : null

    const content = rawMsg.content ?? rawMsg.text ?? ''

    // ==== 1. Lấy createdAt gốc từ socket / fallback ====
    let createdAtRaw =
      rawMsg.created_at ??
      rawMsg.createdAt ??
      new Date().toISOString()

    // ==== 2. Nếu là chuỗi UTC (có 'Z') -> convert sang LOCAL ====
    let createdAt = createdAtRaw

    if (typeof createdAtRaw === 'string' && createdAtRaw.includes('Z')) {
      const d = new Date(createdAtRaw)
      if (!Number.isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, '0')
        const year = d.getFullYear()
        const month = pad(d.getMonth() + 1)
        const day = pad(d.getDate())
        const hour = pad(d.getHours())      // giờ LOCAL
        const minute = pad(d.getMinutes())
        const second = pad(d.getSeconds())

        // format giống API: "YYYY-MM-DDTHH:MM:SS"
        createdAt = `${year}-${month}-${day}T${hour}:${minute}:${second}`
      }
    }

    // ====== Cập nhật messages nếu đang ở đúng room ======
    setMessages((prev) => {
      // chỉ nhận nếu đang ở đúng room
      if (selectedRoomId !== roomId) return prev

      // tránh duplicate
      if (prev.some((m) => m.id === rawMsg.id)) return prev

      const normalizedMsg = {
        ...rawMsg,
        room_id: roomId,
        sender_id: senderId,
        content,
        created_at: createdAt, // cái ông đã chuẩn hoá ở trên
      }

      // ✅ KHÔNG SORT LẠI NỮA, CHỈ PUSH CUỐI
      return [...prev, normalizedMsg]
    })


    // ====== Cập nhật rooms ======
    setRooms((prev) => {
      let found = false

      let updated = prev.map((room) => {
        if (Number(room.id) !== roomId) return room
        found = true

        const base = {
          ...room,
          updated_at: createdAt,    // 👈 cũng dùng local
          last_message: content,
        }

        if (room.id !== selectedRoomId || document.hidden) {
          const currentUnread = Number(room.unread_count || 0)
          return {
            ...base,
            unread_count: currentUnread + 1,
          }
        }

        return base
      })

      if (!found) {
        console.warn('Realtime msg for room not in state:', roomId, rawMsg)
        return prev
      }

      updated = [...updated].sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
      )

      return updated
    })

    const senderName = rawMsg.sender_name || rawMsg.senderName || 'New message'
    // showBrowserNotification(senderName, content)
  }



  // ======================
  // CREATE GROUP
  // ======================
  const handleCreateGroup = async ({ name, member_ids }) => {
    try {
      const res = await createGroupChat(name, member_ids)
      const room = res.room || res
      if (!room?.id) throw new Error('Invalid room')

      const newRoom = {
        ...room,
        displayName: room.name || 'New Group',
      }

      setRooms((prev) => {
        if (prev.some((r) => r.id === newRoom.id)) return prev
        return [newRoom, ...prev]
      })

      setSelectedRoomId(newRoom.id)
      loadInitialMessages(newRoom.id)
    } catch (err) {
      console.error('Create group failed:', err)
      setMiniMessage({
        type: 'error',
        text: 'Create group failed. Please try again 🤧',
      })
    }
  }

  // ======================
  // ADD MEMBERS
  // ======================
  const addMembersToRoomHandler = async ({ roomId, member_ids }) => {
    try {
      const res = await addMembersToRoom(roomId, member_ids)
      // có thể return để FE dùng nếu muốn show chi tiết added/skipped
      return res
    } catch (err) {
      console.error('Add members failed:', err)
      // throw cho ChatMain catch và setAddFeedback('error')
      throw err
    }
  }

  // ======================
  // OPEN DIRECT ROOM
  // ======================
  const handleOpenDirectRoom = (room, targetUser) => {
    const partnerName =
      targetUser?.full_name ||
      targetUser?.fullName ||
      targetUser?.username

    const newRoom = {
      ...room,
      displayName: partnerName || room.name || 'Direct chat',
    }

    setRooms((prev) => {
      if (prev.some((r) => r.id === newRoom.id)) return prev
      return [newRoom, ...prev]
    })

    setSelectedRoomId(newRoom.id)
    loadInitialMessages(newRoom.id)
  }

  // ======================
  // SEARCH USERS
  // ======================
  const handleSearchUsers = async (keyword) => {
    const q = keyword.trim()
    if (!q) return []

    try {
      const res = await searchUsers(q)
      const arr = Array.isArray(res) ? res : res?.users || []
      return arr.filter((u) => u.id !== user.id)
    } catch {
      return []
    }
  }

  // ======================
  // RETURN NULL WHEN USER NOT LOADED (NO HOOK BELOW THIS POINT)
  // ======================
  if (!user) return null

  const displayName = user.full_name 
  const avatarLetter = displayName.charAt(0).toUpperCase()

  const usersForSidebar = listUsers.filter((u) => u.id !== user.id)



  const handleGetRoomMembers = async (roomId) => {
    try {
      const membersData = await getRoomMembers(roomId); 
      return membersData.members || [];
    } catch (err) {
      console.error('Failed to get room members:', err);
      return [];
    }
  }

  const handleDeleteRoom = async (roomId) => {  
    try {
      await deleteRoom(roomId); 
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    } catch (err) {
      console.error('Delete room failed:', err);
      setMiniMessage({
        type: 'error',
        text: 'Delete room failed. Please try again 🤧',
      })
    }
  }


  // const onUploadRoomImage = async ({ roomId, files }) => {
  //   for (const f of files) {
  //     await uploadRoomImage(roomId, f)   // gọi service của mày
  //   }
  // }

  // ======================
  // RENDER
  // ======================
  return (
    <div className="dashboard">
      <div className="dashboard-box">
        
        {/* LEFT SIDEBAR */}
        <div>
          <UserSidebar
            user={user}
            displayName= {displayName}
            avatarLetter={avatarLetter}
            users={usersForSidebar}
            loadingUsers={loadingUsers}
            userListError={userListError}
            onOpenDirectRoom={handleOpenDirectRoom}
            onSearchUsers={handleSearchUsers}
          />
        </div>

        {/* MAIN CHAT */}
        <main className="chat-main">
          <ChatMain
            selectedRoom={selectedRoom}
            loadingRooms={loadingRooms}
            roomError={roomError}
            messages={messages}
            loadingMessages={loadingMessages}
            messageError={messageError}
            currentUserId={user.id}
            onSendMessage={handleSendMessage}
            setMessages={setMessages}
            onRealtimeMessage={handleRealtimeMessage}
            listUsers={listUsers}
            onAddMembersToRoom={addMembersToRoomHandler}
            onSearchUsers={handleSearchUsers}
            onLoadOlderMessages={handleLoadOlderMessages}
            loadingOlderMessages={loadingOlderMessages}
            hasMoreMessages={hasMoreMessages}
            formatTime={formatTime}
            RoomMembers={handleGetRoomMembers}
            onDeleteRoom={handleDeleteRoom}
            onUploadRoomImages={handleUploadRoomImages}
          />
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="sidebar sidebar-right">
          <RoomSidebar
            rooms={rooms}
            setRooms={setRooms} // ✅ ADD
            selectedRoomId={selectedRoomId}
            onSelectRoom={handleSelectRoom}
            listUsers={usersForSidebar}
            currentUserId={user.id}
            onCreateGroup={handleCreateGroup}
            onSearchUsers={handleSearchUsers}
          />
        </aside>

      </div>
      
      {/* 🎄🎄🎄 NOEL THEME OVERLAY - CHỈ THÊM ĐOẠN NÀY 🎄🎄🎄 */}
      <div className="xmas-overlay" aria-hidden="true">
        {/* Tạo ra 30 hạt rơi, trộn lẫn các loại */}
        {[...Array(30)].map((_, i) => {
          // Random loại hạt (ưu tiên tuyết type-1 nhiều nhất)
          const type = i % 5 === 0 ? 'type-3' : // Quà
                       i % 7 === 0 ? 'type-4' : // Kẹo
                       i % 9 === 0 ? 'type-5' : // Cây thông
                       i % 2 === 0 ? 'type-2' : 'type-1'; // Tuyết lớn/nhỏ
          return <div key={i} className={`xmas-item ${type}`}></div>
        })}
      </div>
       {/* 🎄🎄🎄 END NOEL THEME 🎄🎄🎄 */}

    </div>
  )
}

export default DashboardPage