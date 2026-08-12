import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { GearIcon, SearchIcon, TrendIcon, UserIcon } from "./icons";
import "./Layout.css";

const TABS = [
  { to: "/food/search", label: "Search", Icon: SearchIcon },
  { to: "/settings/profile", label: "Profile", Icon: UserIcon },
  { to: "/settings/system", label: "System", Icon: GearIcon },
  { to: "/weight-log", label: "Weight", Icon: TrendIcon },
];

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
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
            <Icon className="tab-icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
