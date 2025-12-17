// src/layouts/DashboardLayout.jsx
import { Outlet } from "react-router-dom";
import DashboardHeader from "../components/dashboard/DashboardHeader";

export default function DashboardLayout({ user, onLogout }) {
  
  return (
    <div >

      {/* HEADER DÙNG CHUNG */}
      <DashboardHeader
        displayName={user?.display_name || user?.full_name}
        userRole={user?.role}
        onLogout={onLogout}
      />

      {/* Body thay đổi tùy page */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}
