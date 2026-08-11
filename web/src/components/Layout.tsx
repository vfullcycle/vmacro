import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import "./Layout.css";

export default function Layout() {
  const { signOut, user } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-nav">
        <NavLink to="/settings/profile">Profile</NavLink>
        <NavLink to="/settings/system">System</NavLink>
        <NavLink to="/weight-log">Weight log</NavLink>
        <span className="app-nav-spacer" />
        <span className="app-nav-user">{user?.email}</span>
        <button type="button" onClick={() => signOut()}>
          ออกจากระบบ
        </button>
      </header>
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}
