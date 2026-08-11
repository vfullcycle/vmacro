import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import "./Layout.css";

export default function Layout() {
  const { signOut, user } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header-user">{user?.email}</span>
        <button type="button" className="app-header-signout" onClick={() => signOut()}>
          ออกจากระบบ
        </button>
      </header>

      <div className="app-content">
        <Outlet />
      </div>

      <nav className="app-tabbar">
        <NavLink to="/settings/profile" className={({ isActive }) => (isActive ? "active" : "")}>
          Profile
        </NavLink>
        <NavLink to="/settings/system" className={({ isActive }) => (isActive ? "active" : "")}>
          System
        </NavLink>
        <NavLink to="/weight-log" className={({ isActive }) => (isActive ? "active" : "")}>
          Weight
        </NavLink>
      </nav>
    </div>
  );
}
