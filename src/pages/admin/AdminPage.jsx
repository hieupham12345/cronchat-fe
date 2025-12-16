// src/components/admin/AdminPanel.jsx
import { useState } from 'react';
import './AdminPage.css';
import DashboardHeader from "../../components/dashboard/DashboardHeader.jsx";
import { useNavigate } from 'react-router-dom';

const MOCK_USERS = [
  { id: 1, name: 'Admin Master', email: 'admin@example.com', role: 'admin' },
  { id: 2, name: 'User One', email: 'user1@example.com', role: 'user' },
  { id: 3, name: 'User Two', email: 'user2@example.com', role: 'user' },
];

const MOCK_ROOMS = [
  { id: 1, name: 'General', members: 10 },
  { id: 2, name: 'Dev Team', members: 5 },
];

function AdminPanel() {
  const [activeSection, setActiveSection] = useState('users'); // 'users' | 'rooms' | 'settings'

  
  return (
    <div className="dashboard">

    <div className="admin-panel">
      {/* MENU TRÁI */}
      <aside className="admin-sidebar">
        <button
          className={
            'admin-sidebar-item' +
            (activeSection === 'users' ? ' admin-sidebar-item-active' : '')
          }
          onClick={() => setActiveSection('users')}
        >
          👤 User management
        </button>
        <button
          className={
            'admin-sidebar-item' +
            (activeSection === 'rooms' ? ' admin-sidebar-item-active' : '')
          }
          onClick={() => setActiveSection('rooms')}
        >
          💬 Chat room management
        </button>
      </aside>

      {/* NỘI DUNG PHẢI */}
      <main className="admin-content">
        {activeSection === 'users' && <AdminUsersSection />}
        {activeSection === 'rooms' && <AdminRoomsSection />}
        {activeSection === 'settings' && <AdminSettingsSection />}
      </main>
    </div>
    </div> 
  );
}

// ======= USERS SECTION (CRUD demo) =======

function AdminUsersSection() {
  const [users, setUsers] = useState(MOCK_USERS);

  const handleAdd = () => {
    const newUser = {
      id: Date.now(),
      name: 'New User',
      email: 'new@example.com',
      role: 'user',
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const handleEdit = (user) => {
    // demo: đổi role user -> admin
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, role: u.role === 'user' ? 'admin' : 'user' } : u
      )
    );
  };

  const handleDelete = (user) => {
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  };

  return (
    <section>
      <div className="admin-content-header">
        <div>
          <h2 className="admin-content-title">User management</h2>
          <p className="admin-content-subtitle">
            Thêm / sửa / xóa user. Sau này nối API vào là chạy thật.
          </p>
        </div>
        <button className="admin-primary-btn" onClick={handleAdd}>
          + Thêm user
        </button>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Email</th>
              <th>Role</th>
              <th style={{ width: '140px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span
                    className={
                      'admin-badge ' +
                      (u.role === 'admin' ? 'admin-badge-admin' : 'admin-badge-user')
                    }
                  >
                    {u.role}
                  </span>
                </td>
                <td>
                  <div className="admin-action-group">
                    <button
                      className="admin-action-btn admin-action-edit"
                      onClick={() => handleEdit(u)}
                    >
                      Sửa
                    </button>
                    <button
                      className="admin-action-btn admin-action-delete"
                      onClick={() => handleDelete(u)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-table-empty">
                  Chưa có user nào 🤔
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ======= ROOMS SECTION =======

function AdminRoomsSection() {
  const [rooms, setRooms] = useState(MOCK_ROOMS);

  const handleAdd = () => {
    const newRoom = {
      id: Date.now(),
      name: 'New Room',
      members: 0,
    };
    setRooms((prev) => [...prev, newRoom]);
  };

  const handleEdit = (room) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === room.id ? { ...r, name: r.name + ' (edited)' } : r
      )
    );
  };

  const handleDelete = (room) => {
    setRooms((prev) => prev.filter((r) => r.id !== room.id));
  };

  return (
    <section>
      <div className="admin-content-header">
        <div>
          <h2 className="admin-content-title">Quản lý phòng chat</h2>
          <p className="admin-content-subtitle">
            Tạo / đổi tên / xóa phòng. Sau này map với API phòng thật.
          </p>
        </div>
        <button className="admin-primary-btn" onClick={handleAdd}>
          + Thêm phòng
        </button>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên phòng</th>
              <th>Số thành viên</th>
              <th style={{ width: '140px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.members}</td>
                <td>
                  <div className="admin-action-group">
                    <button
                      className="admin-action-btn admin-action-edit"
                      onClick={() => handleEdit(r)}
                    >
                      Sửa
                    </button>
                    <button
                      className="admin-action-btn admin-action-delete"
                      onClick={() => handleDelete(r)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {rooms.length === 0 && (
              <tr>
                <td colSpan={4} className="admin-table-empty">
                  Chưa có phòng nào 🕳
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ======= SETTINGS SECTION =======

function AdminSettingsSection() {
  const handleSave = () => {
  };

  return (
    <section>
      <div className="admin-content-header">
        <div>
          <h2 className="admin-content-title">Cấu hình hệ thống</h2>
          <p className="admin-content-subtitle">
            Một số setting demo. Sau này ông map qua config API / DB.
          </p>
        </div>
      </div>

      <div className="admin-settings-grid">
        <div className="admin-settings-card">
          <h3>Giới hạn tin nhắn</h3>
          <p>Set giới hạn số tin nhắn mỗi phòng / ngày.</p>
          <input
            type="number"
            defaultValue={1000}
            className="admin-input"
          />
        </div>

        <div className="admin-settings-card">
          <h3>Cho phép đăng ký mới</h3>
          <p>Bật / tắt mở đăng ký user mới.</p>
          <select className="admin-input">
            <option value="on">Bật</option>
            <option value="off">Tắt</option>
          </select>
        </div>

        <div className="admin-settings-card">
          <h3>Chế độ bảo trì</h3>
          <p>Chặn user thường, chỉ admin vào được.</p>
          <select className="admin-input">
            <option value="off">Tắt</option>
            <option value="on">Bật</option>
          </select>
        </div>
      </div>

      <div className="admin-settings-actions">
        <button className="admin-primary-btn" onClick={handleSave}>
          Lưu cấu hình
        </button>
      </div>
    </section>
  );
}

export default AdminPanel;
