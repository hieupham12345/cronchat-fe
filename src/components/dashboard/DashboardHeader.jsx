// src/components/dashboard/DashboardHeader.jsx
import { useNavigate } from "react-router-dom";

function DashboardHeader({ displayName, userRole, onLogout }) {
  const navigate = useNavigate();

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        <span className="app-logo">⚙️</span>
        <span className="app-name">CronChat</span>
        <span className="app-env-badge">DEV</span>

        <button
          className="admin-tab"
          onClick={() => navigate("/dashboard")}
          style={{
            marginLeft: "12px",
            background: "transparent",
            border: "1px solid #334155",
            padding: "4px 12px",
            borderRadius: "8px",
            color: "#cbd5e1",
            cursor: "pointer",
          }}
        >
          DashBoard
        </button>

        {/* Admin tab chỉ admin mới thấy */}
        {userRole === "admin" && (
          <button
            className="admin-tab"
            onClick={() => navigate("/admin")}
            style={{
              marginLeft: "12px",
              background: "transparent",
              border: "1px solid #334155",
              padding: "4px 12px",
              borderRadius: "8px",
              color: "#cbd5e1",
              cursor: "pointer",
            }}
          >
            Admin
          </button>
        )}
      </div>

      <div className="dashboard-header-right">
        <span className="dashboard-hello">
          Hello,&nbsp;
          <strong>{displayName}</strong> 👋
        </span>
        <button className="logout-btn" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

export default DashboardHeader;
