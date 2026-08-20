import { NavLink, Outlet } from "react-router-dom";
import { DashboardIcon, DiaryIcon, GearIcon, SearchIcon } from "./icons";
import "./Layout.css";

const TABS = [
  { to: "/diary", label: "Diary", Icon: DiaryIcon },
  { to: "/food/search", label: "Search", Icon: SearchIcon },
  { to: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { to: "/settings", label: "Settings", Icon: GearIcon },
];

export default function Layout() {
  return (
    <div className="app-shell">
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
