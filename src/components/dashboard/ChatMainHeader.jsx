// src/components/dashboard/ChatMainHeader.jsx
import React, { useState, useEffect } from 'react';
import buildImageUrl from '../../utils/imageHandle';
import { removeMemberFromRoom } from '../../services/roomService';

function ChatMainHeader({
  hasRoom,
  selectedRoom,
  membersInRooms = [],
  onOpenAddMembers,
  currentUserId,
  onMemberRemoved,   // 👈 giữ lại để parent update list member
  handleDeleteRoom, 
  onSendSystem
   // 👈 hàm delete room từ parent (BE xử lý group + direct)
}) {
  const [showMembersPopup, setShowMembersPopup] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);

  // popup confirm remove member
  const [memberToRemove, setMemberToRemove] = useState(null);

  // popup confirm delete room
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);

  // message thông báo chung
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: string }

  // auto clear feedback
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(t);
  }, [feedback]);

  const title = hasRoom
    ? selectedRoom?.displayName || selectedRoom?.name
    : 'Select a room to start chatting';

  const isGroup = selectedRoom?.type === 'group';
  const isDirect = selectedRoom?.type === 'direct';

  const isGroupOwner =
    isGroup && selectedRoom?.created_by === currentUserId;

  // ===== Quyền delete:
  // - group: chỉ owner
  // - direct: bất kỳ member nào (UI: ai vào được room thì thấy được nút delete)
  const canDeleteRoom =
    (isGroup && isGroupOwner) || isDirect;

  // =========================
  // REMOVE MEMBER (GROUP)
  // =========================

  const handleRemoveMemberClick = (member) => {
    setMemberToRemove(member);
  };

    const handleConfirmRemove = async () => {
    if (!selectedRoom || !memberToRemove) return;

    const member = memberToRemove;

    try {
      setRemovingUserId(member.user_id);

      await removeMemberFromRoom(selectedRoom.id, member.user_id);

      // ✅ UI update ngay, khỏi chờ WS
      onMemberRemoved?.(member.user_id);
      await onSendSystem(`🚫 Removed ${member.full_name}`)

      setFeedback({
        type: 'success',
        text: `Removed "${member.full_name}" from this group.`,
      });

      setMemberToRemove(null);
    } catch (err) {
      console.error('Remove member error:', err);
      setFeedback({
        type: 'error',
        text: 'Failed to remove member. Please try again.',
      });
    } finally {
      setRemovingUserId(null);
    }
  };



  const handleCancelRemove = () => {
    if (removingUserId) return; // đang remove thì không cho đóng
    setMemberToRemove(null);
  };

  // =========================
  // DELETE ROOM (GROUP + DIRECT)
  // =========================

  const handleDeleteRoomClick = () => {
    if (!canDeleteRoom) return;
    setShowDeleteConfirm(true); // step 1: UI confirm
  };

  const handleCancelDeleteRoom = () => {
    if (deletingRoom) return;
    setShowDeleteConfirm(false);
  };

  const handleConfirmDeleteRoom = async () => {
    if (!selectedRoom || !handleDeleteRoom) return;

    const roomName =
      selectedRoom.displayName ||
      selectedRoom.name ||
      (isGroup ? 'this group' : 'this chat');

    // 🚨 STEP 2: confirm lần 2 bằng window.confirm cho cả GROUP + DIRECT
    const ok = window.confirm(
      `⚠ This will permanently delete "${roomName}" and all its messages.\n` +
        `This action cannot be undone.\n\n` +
        `Are you absolutely sure you want to delete ${
          isGroup ? 'this group chat' : 'this direct chat'
        }?`
    );

    if (!ok) {
      // user đổi ý -> không delete
      return;
    }

    try {
      setDeletingRoom(true);
      await handleDeleteRoom(selectedRoom.id);

      setFeedback({
        type: 'success',
        text: isGroup
          ? `Deleted group "${roomName}".`
          : `Deleted conversation "${roomName}".`,
      });

      setShowDeleteConfirm(false);

      // Nếu muốn chơi ác hơn thì thêm 1 alert nữa:
      // window.alert(`"${roomName}" has been deleted.`);
    } catch (err) {
      console.error('Delete room error:', err);
      setFeedback({
        type: 'error',
        text: 'Failed to delete room. Please try again.',
      });
    } finally {
      setDeletingRoom(false);
    }
  };

  return (
    <>
      <div className="chat-header">
        <h2 className="chat-title">{title}</h2>

        {selectedRoom && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* ===== GROUP BUTTONS ===== */}
            {isGroup && (
              <>
                <button
                  className="create-room-btn"
                  onClick={() => setShowMembersPopup(true)}
                >
                  👥 Members ({membersInRooms.length})
                </button>

                <button className="create-room-btn" onClick={onOpenAddMembers}>
                  ＋ Add member
                </button>
              </>
            )}

            {/* ===== DELETE BUTTON (GROUP owner + DIRECT both sides) ===== */}
            {canDeleteRoom && (
              <button
                className="create-room-btn delete-room-btn"
                onClick={handleDeleteRoomClick}
                disabled={deletingRoom}
              >
                {deletingRoom ? 'Deleting...' : '🗑 Delete chat'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===== POPUP MEMBERS (ONLY GROUP) ===== */}
      {showMembersPopup && isGroup && (
        <div
          className="create-group-overlay"
          onClick={() => setShowMembersPopup(false)}
        >
          <div
            className="create-group-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="create-group-header">
              <div className="create-group-title">Group Members</div>
              <button
                className="create-group-close-btn"
                onClick={() => setShowMembersPopup(false)}
              >
                ✖
              </button>
            </div>

            {/* feedback dùng chung (remove member + delete room) */}
            {feedback && (
              <div
                className={`feedback-message ${
                  feedback.type === 'error'
                    ? 'feedback-error'
                    : 'feedback-success'
                }`}
                style={{ marginTop: '8px', marginBottom: '4px' }}
              >
                {feedback.text}
              </div>
            )}

            <div className="create-group-body">
              <div className="create-group-user-list">
                {membersInRooms.map((m) => {
                  const isOwner = m.member_role === 'owner';
                  const canRemove = isGroupOwner && !isOwner;

                  return (
                    <div
                      key={m.user_id}
                      className="create-group-user-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        width: '95%',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <div className="user-avatar-circle">
                          {m.avatar_url ? (
                            <img src={buildImageUrl(m.avatar_url)} />
                          ) : (
                            m.full_name?.[0]?.toUpperCase()
                          )}
                        </div>

                        <div className="user-info">
                          <div className="user-fullname">
                            {m.full_name}
                            {isOwner && (
                              <span className="user-role-tag">Owner</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {canRemove && (
                        <button
                          className="remove-member-btn"
                          onClick={() => handleRemoveMemberClick(m)}
                          disabled={removingUserId === m.user_id}
                        >
                          {removingUserId === m.user_id
                            ? 'Removing...'
                            : 'Remove'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popup confirm remove member */}
            {memberToRemove && (
              <div
                className="confirm-remove-overlay"
                onClick={handleCancelRemove}
              >
                <div
                  className="confirm-remove-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="confirm-remove-title">
                    Remove member from group?
                  </div>
                  <div className="confirm-remove-text">
                    Are you sure you want to remove{' '}
                    <strong>{memberToRemove.full_name}</strong> from this group?
                  </div>

                  <div className="confirm-remove-actions">
                    <button
                      className="confirm-remove-cancel-btn"
                      onClick={handleCancelRemove}
                      disabled={!!removingUserId}
                    >
                      Cancel
                    </button>
                    <button
                      className="confirm-remove-ok-btn"
                      onClick={handleConfirmRemove}
                      disabled={!!removingUserId}
                    >
                      {removingUserId === memberToRemove.user_id
                        ? 'Removing...'
                        : 'Yes, remove'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Popup confirm delete room (GROUP + DIRECT, step 1, step 2 = window.confirm) ===== */}
      {showDeleteConfirm && (
        <div
          className="confirm-remove-overlay"
          onClick={handleCancelDeleteRoom}
        >
          <div
            className="confirm-remove-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-remove-title">
              {isGroup ? 'Delete this group?' : 'Delete this conversation?'}
            </div>
            <div className="confirm-remove-text">
              Are you sure you want to delete{' '}
              <strong>
                {selectedRoom?.displayName ||
                  selectedRoom?.name ||
                  (isGroup ? 'this group' : 'this conversation')}
              </strong>
              ? This action cannot be undone.
            </div>

            <div className="confirm-remove-actions">
              <button
                className="confirm-remove-cancel-btn"
                onClick={handleCancelDeleteRoom}
                disabled={deletingRoom}
              >
                Cancel
              </button>
              <button
                className="confirm-remove-ok-btn"
                onClick={handleConfirmDeleteRoom}
                disabled={deletingRoom}
              >
                {deletingRoom ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatMainHeader;
