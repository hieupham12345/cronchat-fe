import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

import LoginPage from './pages/login/LoginPage.jsx'
import DashboardPage from './pages/dashboard/DashBoardPage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import {
  logout,
  isTokenValid,
  refreshAccessToken,
} from './services/authService.js'

// =======================
//  ProtectedRoute: bảo vệ route cần login
// =======================
function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        // 1. Nếu token trong RAM còn sống -> cho qua
        if (isTokenValid()) {
          if (!cancelled) setChecking(false)
          return
        }

        // 2. Hết hạn / chưa có -> thử refresh bằng cookie
        await refreshAccessToken()

        // 3. Refresh ok -> token mới đã set vào RAM
        if (!cancelled) {
          setChecking(false)
        }
      } catch (err) {
        // 4. Refresh fail -> đá về /login
        if (!cancelled) {
          navigate('/login', { replace: true })
        }
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [navigate])

  if (checking) {
    // Loading UI tuỳ mày, tạm cho text
    return <div className="loading-page">Checking session...</div>
  }

  return children
}

// ✅ Route guard cho trang admin
function AdminRoute({ user, children }) {
  // chưa login -> đá về /login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // login rồi nhưng không phải admin -> đá về /dashboard (hoặc /403 nếu mày làm thêm)
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // đúng là admin -> cho vào
  return children
}

function App() {
  const userStored = localStorage.getItem('currentUser')
  const [user, setUser] = useState(userStored ? JSON.parse(userStored) : null)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout() // xoá access token trong RAM + gọi /logout xoá cookie
    localStorage.removeItem('currentUser')
    setUser(null)
    navigate('/login', { replace: true })
  }

  return (
    <Routes>
      {/* Login page (không cần ProtectedRoute) */}
      <Route path="/login" element={<LoginPage />} />

      {/* Layout chung cho dashboard + admin, được bảo vệ bằng ProtectedRoute */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={<DashboardPage user={user} setUser={setUser} />}
        />

        {/* ✅ Trang admin: thêm AdminRoute check role */}
        <Route
          path="/admin"
          element={
            <AdminRoute user={user}>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Route>

      {/* Mặc định: quăng về /login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
